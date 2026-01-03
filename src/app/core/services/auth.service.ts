import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthSession, User, Provider } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private supabase = inject(SupabaseService);

    private _session = new BehaviorSubject<AuthSession | null>(null);
    readonly session$ = this._session.asObservable();

    private _user = new BehaviorSubject<User | null>(null);
    readonly user$ = this._user.asObservable();

    constructor() {
        this.init();
    }

    private async init() {
        const { data: { session } } = await this.supabase.client.auth.getSession();
        this._session.next(session);
        this._user.next(session?.user ?? null);

        this.supabase.client.auth.onAuthStateChange((_event, session) => {
            this._session.next(session);
            this._user.next(session?.user ?? null);
        });
    }

    async signIn(email: string) {
        return this.supabase.client.auth.signInWithOtp({
            email,
        });
    }

    async signInWithPassword(email: string, password: string) {
        return this.supabase.client.auth.signInWithPassword({
            email,
            password,
        });
    }

    async signUp(email: string, password: string) {
        return this.supabase.client.auth.signUp({
            email,
            password,
        });
    }

    async signOut() {
        return this.supabase.client.auth.signOut();
    }

    get currentUser() {
        return this._user.value;
    }

    getSession() {
        return this.supabase.client.auth.getSession();
    }
}
