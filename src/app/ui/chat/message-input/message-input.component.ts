import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Send, Paperclip, Smile } from 'lucide-angular';

@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-4 bg-background border-t border-border">
      <div class="flex items-end gap-2 bg-secondary/50 p-2 rounded-xl border border-border focus-within:ring-1 focus-within:ring-ring transition-all">
        <button class="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary">
          <lucide-icon name="paperclip" class="w-5 h-5"></lucide-icon>
        </button>
        
        <textarea
          [(ngModel)]="message"
          (keydown.enter)="onKeyDown($event)"
          [placeholder]="placeholder"
          rows="1"
          class="flex-1 bg-transparent border-none focus:ring-0 resize-none py-2 px-2 max-h-32 text-sm placeholder:text-muted-foreground scrollbar-thin"
          style="min-height: 2.5rem;"
        ></textarea>

        <button class="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary">
          <lucide-icon name="smile" class="w-5 h-5"></lucide-icon>
        </button>

        <button 
          (click)="handleSend()"
          [disabled]="!message.trim()"
          class="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <lucide-icon name="send" class="w-5 h-5"></lucide-icon>
        </button>
      </div>
    </div>
  `
})
export class MessageInputComponent {
  @Input() placeholder = 'Type a message...';
  @Output() send = new EventEmitter<string>();

  message = '';

  handleSend() {
    if (!this.message.trim()) return;
    this.send.emit(this.message);
    this.message = '';
  }

  onKeyDown(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) {
      event.preventDefault();
      this.handleSend();
    }
  }
}
