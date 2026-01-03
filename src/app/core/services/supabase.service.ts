import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class SupabaseService {
    private supabase: SupabaseClient | null = null;

    constructor() {
        const { supabaseUrl, supabaseKey } = environment;
        console.log('Supabase Initialized:', supabaseUrl);
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    get client() {
        return this.supabase!;
    }
}
