import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { cn } from '../../../shared/utils/cn';

@Component({
    selector: 'app-chat-header',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    templateUrl: './chat-header.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatHeaderComponent {
    @Input() roomName = '';
    @Input() roomType: 'room' | 'dm' = 'room';
    @Input() memberCount = 0;
    @Input() onlineCount = 0;
    @Input() isOnline = true;

    cn = cn;

    getInitials(name: string): string {
        return name.split(" ").map(n => n[0]).join("");
    }
}
