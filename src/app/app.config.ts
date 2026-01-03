import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  LucideAngularModule,
  MessageCircle, Hash, ChevronDown, ChevronRight, Plus, Users, Phone, Video, Pin, Search, MoreVertical, Bell, Paperclip, Smile, Send, Check, CheckCheck, LogOut
} from 'lucide-angular';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    importProvidersFrom(LucideAngularModule.pick({
      MessageCircle, Hash, ChevronDown, ChevronRight, Plus, Users, Phone, Video, Pin, Search, MoreVertical, Bell, Paperclip, Smile, Send, Check, CheckCheck, LogOut
    }))
  ]
};
