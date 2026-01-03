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
            const dm = dms.find(d => d.id === selectedRoomId || `dm-${d.id}` === selectedRoomId); // Handle ID format if needed

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
            }

            return {
                messages,
                roomName,
                roomType,
                isOnline,
                onlineCount,
                memberCount: totalUsersCount
            };
        }),
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
