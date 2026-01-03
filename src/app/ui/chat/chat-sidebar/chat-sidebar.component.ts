import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatStateService } from '../../../core/services/chat-state.service';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { cn } from '../../../shared/utils/cn';

@Component({
    selector: 'app-chat-sidebar',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    templateUrl: './chat-sidebar.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatSidebarComponent {
    private chatService = inject(ChatStateService);
    private authService = inject(AuthService);
    private router = inject(Router);

    rooms$ = this.chatService.rooms$;
    dms$ = this.chatService.dms$;
    selectedRoom$ = this.chatService.selectedRoom$;

    // Online tracking is handled reactively via dms$

    roomsExpanded = true;
    dmsExpanded = true;

    // Make cn available
    cn = cn;

    async selectRoom(roomOrUserId: string) {
        // We need to differentiate between Room ID (UUIDv4) and User ID (UUIDv4).
        // The problem is they look same.
        // Strategy: In dms$, we can map the "id" to "user:<id>" or just keep it as ID.
        // If we kept `id` as User ID in `dms$` (which comes from `loadAllUsers`), 
        // passing it here means we need to "find existing room for this user" or "create one".

        // Let's delegate this intelligence to the Service.
        // BUT: The service's current `selectRoom` expects a ROOM ID.

        // Let's check if the ID corresponds to a known ROOM in `rooms$`.
        // If not, assume it's a User ID and call `startDm`.

        let isRoom = false;
        this.chatService.rooms$.subscribe(rooms => {
            if (rooms.some(r => r.id === roomOrUserId)) isRoom = true;
        }).unsubscribe(); // Need to take 1 synchronous value

        // This is tricky because dms$ items might have Room ID (if existing) or User ID (if new).
        // Let's try to pass the FULL object in html, not just ID.

        // Fallback: Just call a new method `handleDmSelection(id)`

        this.chatService.handleDmSelection(roomOrUserId);
    }

    getDmDisplayName(name: string): string {
        // If the name is comma separated, try to remove my own name?
        // Actually, user IDs are usually not in the name if it's "Chat with X".
        // Let's assume the backend or service provides a friendly name in 'name'.
        // If logic is needed: return name.replace(this.authService.currentUser?.email || '', '').replace(', ', '');
        return name;
    }

    async logout() {
        await this.authService.signOut();
        this.router.navigate(['/login']);
    }
}
