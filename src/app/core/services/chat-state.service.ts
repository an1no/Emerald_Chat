import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Message, Room, DirectMessage, Profile } from '../models/message.model';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({
    providedIn: 'root'
})
export class ChatStateService {
    private supabaseService = inject(SupabaseService);
    private authService = inject(AuthService);

    private currentChannel: RealtimeChannel | null = null;

    /*
     * State Streams
     */
    private _messages = new BehaviorSubject<Message[]>([]);
    public messages$ = this._messages.asObservable();

    private _selectedRoom = new BehaviorSubject<string>('');
    public selectedRoom$ = this._selectedRoom.asObservable();

    private _rooms = new BehaviorSubject<Room[]>([]);
    public rooms$ = this._rooms.asObservable();

    private _dms = new BehaviorSubject<DirectMessage[]>([]);
    private _onlineUsers = new BehaviorSubject<Set<string>>(new Set());

    public dms$ = combineLatest([this._dms, this._onlineUsers]).pipe(
        map(([dms, onlineUsers]) => {
            return dms.map(dm => ({
                ...dm,
                online: dm.userId ? onlineUsers.has(dm.userId) : false
            }));
        })
    );

    constructor() {
        this.loadRooms();
        this.loadAllUsers();
        this.authService.user$.subscribe(user => {
            if (user) {
                this.initPresence(user.id);
            }
        });
    }

    /*
     * Actions
     */
    async loadRooms() {
        try {
            const { data, error } = await this.supabaseService.client
                .from('rooms')
                .select('*');

            if (error) throw error;

            if (data) {
                const allRooms: Room[] = data.map((r: any) => ({
                    id: r.id,
                    name: r.name,
                    is_dm: r.is_dm
                }));

                // Split into sections
                const publicRooms = allRooms.filter(r => !r.is_dm);
                const dms = allRooms.filter(r => r.is_dm).map(r => ({
                    id: r.id,
                    name: r.name,
                    avatar: 'U',
                    online: false,
                    // For now, assume room name is the user's name. 
                    // To get real user ID, we would need to join room_participants.
                    // Placeholder: we don't have the other user ID easily here without a join.
                    // But for online presence test, let's allow matching by ID if r.name WAS an ID (unlikely).
                    userId: undefined // TODO: Fetch real participant user_id
                } as DirectMessage));

                this._rooms.next(publicRooms);
                this._dms.next(dms);

                // Select first room if none selected
                if (!this._selectedRoom.value && publicRooms.length > 0) {
                    this.selectRoom(publicRooms[0].id);
                }
            }
        } catch (error) {
            console.error('Error loading rooms:', error);
        }
    }

    selectRoom(roomId: string) {
        this._selectedRoom.next(roomId);
        this.loadMessages(roomId);
        this.initRealtime(roomId);
    }

    async loadMessages(roomId: string) {
        try {
            const { data, error } = await this.supabaseService.client
                .from('messages')
                .select('*, profiles(username, avatar_url)')
                .eq('room_id', roomId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (data) {
                const currentUserId = this.authService.currentUser?.id;
                const messages: Message[] = data.map((m: any) => ({
                    id: m.id,
                    content: m.content,
                    sender: m.profiles?.username || (m.user_id === currentUserId ? 'You' : 'User ' + m.user_id.slice(0, 4)),
                    avatar: m.profiles?.avatar_url || (m.user_id === currentUserId ? 'ME' : 'U'),
                    timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isOwn: m.user_id === currentUserId,
                    status: 'read', // Default for history
                    profile: m.profiles
                }));
                this._messages.next(messages);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }
    async loadAllUsers() {
        try {
            const { data, error } = await this.supabaseService.client
                .from('profiles')
                .select('*');

            if (error) throw error;

            if (data) {
                const users: DirectMessage[] = data.map((p: any) => ({
                    id: p.id, // For creating a NEW DM, we use User ID initially, then Room ID once created. 
                    // This dual-use of 'id' in the UI model is tricky. 
                    // Let's treat valid Room IDs as Rooms, and User IDs as "Potential Rooms".
                    name: p.username,
                    avatar: p.avatar_url,
                    userId: p.id,
                    online: false
                }));
                this._users.next(users);
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    async startDm(otherUserId: string) {
        // Check if room exists (this logic is complex without proper backend check, 
        // but we can try to find a room where room_participants includes both and type is DM).
        // For this MVP, let's just create a new room for now or implement a "get_or_create_dm" RPC.

        // SIMPLIFIED MVP: Just create a room if one doesn't exist in our LOCAL list (which is weak).
        // Better: Call an RPC or Edge Function.
        // FALLBACK: Just create a room.

        const currentUserId = this.authService.currentUser?.id;
        if (!currentUserId) return;

        // Attempt to create room
        const { data: newRoom, error } = await this.supabaseService.client
            .from('rooms')
            .insert({ name: 'DM', is_dm: true }) // Name doesn't matter much for DM
            .select()
            .single();

        if (error) {
            console.error('Error creating DM room:', error);
            return;
        }

        // Add participants
        await this.supabaseService.client
            .from('room_participants')
            .insert([
                { room_id: newRoom.id, user_id: currentUserId },
                { room_id: newRoom.id, user_id: otherUserId }
            ]);

        // Reload rooms to refresh the list (and hopefully pick up the new room)
        // But since we are showing ALL users, we just need to "select" this user context.
        // Actually, we need to map the User ID to the new Room ID to open the chat window.
        // This suggests we need a mechanism to Select Room By User ID.

        // For now, let's just reload rooms and select the new one.
        await this.loadRooms();
        this.selectRoom(newRoom.id);
    }

    async sendMessage(content: string) {
        const roomId = this._selectedRoom.value;
        if (!roomId) return;

        const currentUserId = this.authService.currentUser?.id;
        if (!currentUserId) {
            console.error('User not authenticated');
            return;
        }

        const tempId = Date.now().toString();
        const newMessage: Message = {
            id: tempId,
            content,
            sender: "You",
            avatar: "ME",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isOwn: true,
            status: "sent",
        };

        // Optimistic update
        this._messages.next([...this._messages.value, newMessage]);

        try {
            const { data, error } = await this.supabaseService.client
                .from('messages')
                .insert({
                    content,
                    room_id: roomId,
                    user_id: currentUserId
                })
                .select()
                .single();

            if (error) throw error;

            // Update with real ID from server and set status to delivered
            const messages = this._messages.value.map(m =>
                m.id === tempId ? {
                    ...m,
                    id: data.id,
                    status: 'delivered' as const,
                    timestamp: new Date(data.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                } : m
            );
            this._messages.next(messages);

        } catch (error) {
            console.error('Error sending message:', error);
            // Revert optimistic update on failure
            this._messages.next(this._messages.value.filter(m => m.id !== tempId));
        }
    }

    private updateMessageStatus(id: string, status: 'delivered' | 'read') {
        const messages = this._messages.value.map(m =>
            m.id === id ? { ...m, status } : m
        );
        this._messages.next(messages);
    }

    private initRealtime(roomId: string) {
        if (this.currentChannel) {
            this.currentChannel.unsubscribe();
        }

        this.currentChannel = this.supabaseService.client.channel(`room:${roomId}`)
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `room_id=eq.${roomId}`
                },
                payload => {
                    const newMessage = payload.new as any;

                    // Check for duplicates (Optimistic UI)
                    // We check if we have a message with the same ID (unlikely if it's new from server)
                    // or if we have a message with "sent" status that matches content.

                    const currentMessages = this._messages.value;
                    const exists = currentMessages.some(m => m.id === newMessage.id);
                    if (exists) return;

                    // If it's our own message coming back, sendMessage() handles the ID swap.
                    // But realtime might arrive before sendMessage() awaits connection.
                    const currentUserId = this.authService.currentUser?.id;
                    if (newMessage.user_id === currentUserId) {
                        return;
                    }

                    // It's a message from someone else
                    const message: Message = {
                        id: newMessage.id,
                        content: newMessage.content,
                        sender: 'User ' + newMessage.user_id.slice(0, 4), // Placeholder name
                        avatar: 'U',
                        timestamp: new Date(newMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        isOwn: false,
                        status: 'read'
                    };

                    this._messages.next([...this._messages.value, message]);
                }
            )
            .subscribe();
    }
    private async initPresence(userId: string) {
        const channel = this.supabaseService.client.channel('online-users', {
            config: {
                presence: {
                    key: userId,
                },
            },
        });

        channel.on('presence', { event: 'sync' }, () => {
            const newState = channel.presenceState();
            const onlineIds = new Set(Object.keys(newState));
            this._onlineUsers.next(onlineIds);
        })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ online_at: new Date().toISOString() });
                }
            });
    }
}
