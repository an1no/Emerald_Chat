import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-typing-indicator',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div *ngIf="users.length > 0" class="flex items-center gap-1 text-xs font-medium text-muted-foreground animate-fade-in p-4">
      <div class="flex items-center gap-0.5 mr-1 bg-secondary/50 px-2 py-1 rounded-full">
        <span class="w-1 h-1 rounded-full bg-typing typing-dot"></span>
        <span class="w-1 h-1 rounded-full bg-typing typing-dot"></span>
        <span class="w-1 h-1 rounded-full bg-typing typing-dot"></span>
      </div>
      <span>{{ getUsersText() }}</span>
    </div>
  `
})
export class TypingIndicatorComponent {
    @Input() users: string[] = [];

    getUsersText(): string {
        return `${this.users.join(", ")} ${this.users.length === 1 ? "is" : "are"} typing...`;
    }
}
