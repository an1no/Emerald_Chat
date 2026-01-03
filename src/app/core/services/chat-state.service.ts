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
    private _users = new BehaviorSubject<DirectMessage[]>([]);
    private _onlineUsers = new BehaviorSubject<Set<string>>(new Set());
    private _dmMap = new BehaviorSubject<Map<string, string>>(new Map()); // Map<OtherUserId, RoomId>

    public dms$ = combineLatest([this._dms, this._users, this._onlineUsers, this._dmMap]).pipe(
        map(([dms, users, onlineUsers, dmMap]) => {
            const currentUserId = this.authService.currentUser?.id;

            // Map users to DM format
            return users
                .filter(u => u.userId !== currentUserId)
                .map(u => {
                    const existingRoomId = u.userId ? dmMap.get(u.userId) : undefined;
                    return {
                        ...u,
                        // If we have a mapped room ID, use it. Otherwise keep the User ID as ID (for now, until clicked)
                        // Actually, let's allow 'id' to be RoomID if exists, else UserID?
                        // No, let's add a explicit 'roomId' property.
                        roomId: existingRoomId,
                        // Determine if online
                        online: u.userId ? onlineUsers.has(u.userId) : false,
                        // Attempt to find existing DM room info (unread count, etc)
                        // simplified for now
                    } as DirectMessage & { roomId?: string };
                });
        })
    );

    public onlineCount$ = this._onlineUsers.pipe(map(s => s.size));
    public totalUsersCount$ = this._users.pipe(map(u => u.length));

    constructor() {
        this.loadRooms();
        this.loadAllUsers();
        this.authService.user$.subscribe(user => {
            if (user) {
                this.initPresence(user.id);
                this.loadDmMapping(user.id);
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

    async handleDmSelection(targetId: string) {
        // 1. Check if `targetId` is a Room ID we already know (public room).
        const knownPublicRoom = this._rooms.value.find(r => r.id === targetId);
        if (knownPublicRoom) {
            this.selectRoom(targetId);
            return;
        }

        // 2. Just attempt to start DM with this User ID.
        // It's likely a User ID if it didn't match a Room ID.
        await this.startDm(targetId);
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
                    name: p.username || 'User ' + p.id.slice(0, 4),
                    avatar: p.avatar_url || 'U',
                    userId: p.id,
                    online: false
                }));
                this._users.next(users);
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    async loadDmMapping(currentUserId: string) {
        try {
            // 1. Get all room participants for rooms I am in
            // This is a bit heavy, optimizing:
            // Get my rooms first
            const { data: myInvolvements, error: err1 } = await this.supabaseService.client
                .from('room_participants')
                .select('room_id')
                .eq('user_id', currentUserId);

            if (err1) throw err1;
            if (!myInvolvements || myInvolvements.length === 0) return;

            const myRoomIds = myInvolvements.map((i: any) => i.room_id);

            // 2. Get all participants for these rooms to find the partner
            const { data: allParticipants, error: err2 } = await this.supabaseService.client
                .from('room_participants')
                .select('room_id, user_id')
                .in('room_id', myRoomIds); // Only check rooms I am in

            if (err2) throw err2;

            // 3. Filter for DMs (rooms with exactly 2 people? Or check 'rooms' table for is_dm?)
            // We should filter for rooms that are DMs. 
            // Let's fetch the room details for these IDs to be sure it's a DM.

            // Actually, we have `_rooms` loaded which has `is_dm`.
            // But `loadRooms` filters public rooms. And `_dms` (from loadRooms) has IDs.
            // We can check against `this._dms` but `loadRooms` logic for `_dms` was just `filter(r => r.is_dm)`.
            // So we DO know which IDs are DMs.

            // Let's get the list of known DM Room IDs from Supabase again to be safe/clean?
            // Or just trust `is_dm` flag if we had fetched it.

            // Optimization: Let's assume all my 1-on-1 rooms are DMs? No.
            // Let's fetch room types.
            const { data: dmRooms, error: err3 } = await this.supabaseService.client
                .from('rooms')
                .select('id')
                .in('id', myRoomIds)
                .eq('is_dm', true);

            if (err3) throw err3;
            const dmRoomIds = new Set(dmRooms?.map((r: any) => r.id));

            // 4. Build Map
            const map = new Map<string, string>();
            allParticipants?.forEach((p: any) => {
                if (dmRoomIds.has(p.room_id) && p.user_id !== currentUserId) {
                    map.set(p.user_id, p.room_id);
                }
            });

            this._dmMap.next(map);

        } catch (error) {
            console.error('Error loading DM mapping:', error);
        }
    }

    async startDm(otherUserId: string) {
        const currentUserId = this.authService.currentUser?.id;
        if (!currentUserId) return;

        // 1. Check if we already have a mapped DM
        const existingRoomId = this._dmMap.value.get(otherUserId);
        if (existingRoomId) {
            this.selectRoom(existingRoomId);
            return;
        }

        // 2. Create room if not found
        // ... (rest of creation logic)


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

        // Update local map optimistically or reload
        await this.loadRooms();
        await this.loadDmMapping(currentUserId); // Refresh map
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
