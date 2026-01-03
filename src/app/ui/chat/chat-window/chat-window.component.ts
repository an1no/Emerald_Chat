import { Component, ChangeDetectionStrategy, inject, ViewChild, ElementRef, AfterViewChecked, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ChatStateService } from '../../../core/services/chat-state.service';
import { ChatHeaderComponent } from '../chat-header/chat-header.component';
import { MessageBubbleComponent } from '../message-bubble/message-bubble.component';
import { MessageInputComponent } from '../message-input/message-input.component';
import { TypingIndicatorComponent } from '../typing-indicator/typing-indicator.component';
import { combineLatest, map, tap } from 'rxjs';

@Component({
    selector: 'app-chat-window',
    standalone: true,
    imports: [
        CommonModule,
        LucideAngularModule,
        ChatHeaderComponent,
        MessageBubbleComponent,
        MessageInputComponent,
        TypingIndicatorComponent
    ],
    templateUrl: './chat-window.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatWindowComponent implements AfterViewChecked {
    private chatService = inject(ChatStateService);

    @ViewChild('messagesEnd') messagesEndRef?: ElementRef;
    @ViewChild('scrollContainer') scrollContainerRef?: ElementRef;

    // Combine streams to view model
    vm$ = combineLatest([
        this.chatService.messages$,
        this.chatService.selectedRoom$,
        this.chatService.rooms$,
        this.chatService.dms$,
        this.chatService.onlineCount$,
        this.chatService.totalUsersCount$
    ]).pipe(
        map(([messages, selectedRoomId, rooms, dms, onlineCount, totalUsersCount]) => {
            // Find room info
            const room = rooms.find(r => r.id === selectedRoomId);
            // dms now have .roomId property if mapped
            const dm = dms.find(d => (d as any).roomId === selectedRoomId || d.id === selectedRoomId);

            let roomName = 'Chat';
            let roomType: 'room' | 'dm' = 'room';
            let isOnline = true;

            if (room) {
                roomName = room.name;
                roomType = 'room';
            } else if (dm) {
                roomName = dm.name;
                roomType = 'dm';
                isOnline = dm.online;
            } else if (!room && !dm && messages.length > 0) {
                // FALLBACK: If we have messages but ID lookup failed (e.g. race condition),
                // derive the name from the OTHER person in the chat.
                // This assumes it is a DM if not found in rooms.
                const otherMessage = messages.find(m => !m.isOwn);
                if (otherMessage) {
                    roomName = otherMessage.sender;
                    roomType = 'dm';
                    // We can't easily guess online status here without ID, but name is better than "Chat".
                }
            }

            return {
                selectedRoomId, // Debug
                messages,
                roomName,
                roomType,
                isOnline,
                onlineCount,
                memberCount: totalUsersCount
            };
        }),
        tap(vm => console.log('ChatWindow: VM Update', vm)),
        tap(() => this.shouldScroll = true) // Trigger scroll on new data
    );

    private shouldScroll = false;

    ngAfterViewChecked() {
        if (this.shouldScroll) {
            this.scrollToBottom();
            this.shouldScroll = false;
        }
    }

    scrollToBottom(): void {
        try {
            this.messagesEndRef?.nativeElement.scrollIntoView({ behavior: 'smooth' });
        } catch (err) { }
    }

    onSendMessage(content: string) {
        this.chatService.sendMessage(content);
    }
}
