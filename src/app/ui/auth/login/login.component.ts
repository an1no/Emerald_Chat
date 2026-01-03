import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
      <div class="w-full max-w-sm space-y-8">
        <div class="text-center">
          <h2 class="text-3xl font-bold tracking-tight">Emerald Chat</h2>
          <p class="mt-2 text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <div class="space-y-6">
          <div class="space-y-4">
            <div>
              <label for="email" class="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                class="relative block w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Email address"
                [(ngModel)]="email"
              />
            </div>
            <div>
              <label for="password" class="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                class="relative block w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Password"
                [(ngModel)]="password"
              />
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <button
              (click)="handleSignIn()"
              [disabled]="loading"
              class="group relative flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sign in
            </button>
            
            <button
               (click)="handleSignUp()"
               [disabled]="loading"
               class="group relative flex w-full justify-center rounded-md border border-input bg-transparent px-3 py-2 text-sm font-semibold hover:bg-secondary/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create account
            </button>
          </div>

          <p *ngIf="error" class="text-center text-sm text-red-500">{{ error }}</p>
          <p *ngIf="message" class="text-center text-sm text-green-500">{{ message }}</p>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
    private authService = inject(AuthService);
    private router = inject(Router);

    email = '';
    password = '';
    loading = false;
    error = '';
    message = '';

    async handleSignIn() {
        try {
            this.loading = true;
            this.error = '';
            const { error } = await this.authService.signInWithPassword(this.email, this.password);
            if (error) throw error;
            this.router.navigate(['/chat']);
        } catch (e: any) {
            this.error = e.message;
        } finally {
            this.loading = false;
        }
    }

    async handleSignUp() {
        try {
            this.loading = true;
            this.error = '';
            const { error, data } = await this.authService.signUp(this.email, this.password);
            if (error) throw error;
            if (data.user && !data.session) {
                this.message = 'Please check your email for confirmation link';
            } else {
                this.router.navigate(['/chat']);
            }
        } catch (e: any) {
            this.error = e.message;
        } finally {
            this.loading = false;
        }
    }
}
