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

    selectRoom(id: string) {
        this.chatService.selectRoom(id);
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
