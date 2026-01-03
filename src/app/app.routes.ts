import { Routes } from '@angular/router';
import { LoginComponent } from './ui/auth/login/login.component';
import { ChatLayoutComponent } from './ui/layouts/chat-layout.component';
import { inject } from '@angular/core';
import { AuthService } from './core/services/auth.service';
import { Router } from '@angular/router';

const authGuard = async () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const { data: { session } } = await auth.getSession();

    if (!session) {
        return router.createUrlTree(['/login']);
    }

    return true;
};

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    {
        path: 'chat',
        component: ChatLayoutComponent,
        canActivate: [authGuard]
    },
    { path: '', redirectTo: 'login', pathMatch: 'full' }
];
