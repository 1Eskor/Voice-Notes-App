// ─── Database Types ──────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  username: string;
  display_picture: string | null;
  created_at: string;
  is_premium?: boolean;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  audio_url: string;
  waveform_url: string; // URL to a JSON file: number[]
  duration_seconds: number;
  likes_count: number;
  plays_count?: number;
  created_at: string;
  // Joined fields (not in DB, populated via query joins)
  profiles?: Profile;
}

export interface Follow {
  follower_id: string;
  following_id: string;
}

export interface Like {
  user_id: string;
  note_id: string;
}

export interface Comment {
  id: string;
  note_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: Profile;
}

// ─── Enriched Note for UI ─────────────────────────────────────────────────────

export interface NoteWithProfile extends Note {
  profiles: Profile;
  waveform_data?: number[]; // Resolved from waveform_url
  is_liked?: boolean;
}
