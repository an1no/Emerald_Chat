import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatSidebarComponent } from '../chat/chat-sidebar/chat-sidebar.component';
import { ChatWindowComponent } from '../chat/chat-window/chat-window.component';
import { LucideAngularModule } from 'lucide-angular';

@Component({
    selector: 'app-chat-layout',
    standalone: true,
    imports: [ChatSidebarComponent, ChatWindowComponent, LucideAngularModule],
    template: `
    <div class="flex h-screen w-full bg-background font-sans antialiased text-foreground overflow-hidden">
      <app-chat-sidebar></app-chat-sidebar>
      <main class="flex-1 h-full min-w-0">
        <app-chat-window></app-chat-window>
      </main>
    </div>
  `
})
export class ChatLayoutComponent { }
