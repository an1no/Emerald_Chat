import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Check, CheckCheck } from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';
import { cn } from '../../../shared/utils/cn';

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="cn('flex w-full mb-4 animate-fade-in', isOwn ? 'justify-end' : 'justify-start')">
      <!-- Avatar (only for others) -->
      <div *ngIf="!isOwn" class="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium mr-2 flex-shrink-0 overflow-hidden relative">
        <img *ngIf="profile?.avatar_url" [src]="profile?.avatar_url" class="absolute inset-0 w-full h-full object-cover" [alt]="sender">
        <span *ngIf="!profile?.avatar_url">{{ avatar }}</span>
      </div>

      <div [class]="cn('flex flex-col', isOwn ? 'items-end' : 'items-start', 'max-w-[70%]')">
        <!-- Sender Name -->
        <span *ngIf="!isOwn" class="text-xs text-muted-foreground mb-1 ml-1">{{ sender }}</span>

        <!-- Bubble -->
        <div [class]="cn('px-4 py-2 rounded-2xl break-words relative group', 
            isOwn ? 'bg-message-own text-primary-foreground rounded-tr-none' : 'bg-message-other text-foreground rounded-tl-none')">
          <p class="text-sm leading-relaxed">{{ content }}</p>
          
          <!-- Timestamp & Status -->
          <div [class]="cn('text-[10px] mt-1 flex items-center gap-1 opacity-70', isOwn ? 'justify-end text-primary-foreground/80' : 'text-muted-foreground')">
            <span>{{ timestamp }}</span>
            <ng-container *ngIf="isOwn && status">
              <lucide-icon *ngIf="status === 'sent'" name="check" class="w-3 h-3"></lucide-icon>
              <lucide-icon *ngIf="status === 'delivered'" name="check-check" class="w-3 h-3"></lucide-icon>
              <lucide-icon *ngIf="status === 'read'" name="check-check" class="w-3 h-3 text-blue-300"></lucide-icon>
            </ng-container>
          </div>
        </div>
      </div>
    </div>
  `
})
export class MessageBubbleComponent {
  @Input() content = '';
  @Input() sender = '';
  @Input() avatar = '';
  @Input() timestamp = '';
  @Input() isOwn = false;
  @Input() status?: 'sent' | 'delivered' | 'read';
  @Input() profile?: { username: string; avatar_url: string };

  // Expose utils to template
  cn = cn;
}
