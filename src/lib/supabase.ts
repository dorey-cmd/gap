// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Safely initialize Supabase. If credentials are not provided yet,
// the system will run in localStorage fallback mode.
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

/**
 * Utility helper to synchronize assessment drafts to Supabase in the background
 */
export async function syncDraftToSupabase(state: {
  sessionId: string;
  fullName?: string;
  phone?: string;
  email?: string;
  businessName?: string;
  answers: { [key: number]: number };
  comments: { [key: number]: string };
  finalOneThing?: string;
  completed?: boolean;
}) {
  if (!supabase) {
    // Graceful fallback when Supabase is not active
    return null;
  }

  try {
    const payload = {
      session_id: state.sessionId,
      full_name: state.fullName || null,
      phone: state.phone || null,
      email: state.email || null,
      business_name: state.businessName || null,
      answers: state.answers,
      comments: state.comments,
      final_one_thing: state.finalOneThing || null,
      completed: state.completed || false,
      updated_at: new Date().toISOString(),
    };

    // Attempt to upsert based on session_id
    const { data, error } = await supabase
      .from('diagnostics')
      .upsert(payload, { onConflict: 'session_id' });

    if (error) {
      console.warn("Supabase Sync Warning:", error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Supabase Sync Exception:", err);
    return null;
  }
}

/**
 * Fetch a completed or active diagnostic session from Supabase by sessionId
 */
export async function fetchDraftFromSupabase(sessionId: string) {
  if (!supabase) {
    return null;
  }
  try {
    const { data, error } = await supabase
      .from('diagnostics')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (error) {
      console.warn("Supabase Fetch Warning:", error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error("Supabase Fetch Exception:", err);
    return null;
  }
}

