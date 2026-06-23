// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from 'npm:@aws-sdk/client-s3@3.500.0';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
};

serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verify Request Method
    if (req.method !== 'POST' && req.method !== 'DELETE') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Verify Environment Variables
    const requiredEnv = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'R2_ACCOUNT_ID',
      'R2_ACCESS_KEY',
      'R2_SECRET_KEY',
      'R2_BUCKET_NAME',
      'R2_PUBLIC_URL',
    ];
    const missingEnv = requiredEnv.filter((name) => !Deno.env.get(name));
    if (missingEnv.length > 0) {
      console.error('Missing configuration env vars:', missingEnv);
      return new Response(
        JSON.stringify({ error: `Server misconfiguration. Missing: ${missingEnv.join(', ')}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Initialize Supabase Client & Authenticate User
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Handle DELETE request
    if (req.method === 'DELETE') {
      let body;
      try {
        body = await req.json();
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { noteId, audioUrl } = body;
      if (!noteId || !audioUrl) {
        return new Response(JSON.stringify({ error: 'Missing noteId or audioUrl parameters' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Delete note from database first. RLS enforces that only the owner can delete the note.
      const { data: deletedNotes, error: deleteError } = await supabaseClient
        .from('notes')
        .delete()
        .eq('id', noteId)
        .select();

      if (deleteError) {
        console.error('Database deletion error:', deleteError);
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // If no notes were deleted, it means either the note does not exist or user doesn't own it
      if (!deletedNotes || deletedNotes.length === 0) {
        return new Response(JSON.stringify({ error: 'Note not found or unauthorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Initialize S3 Client targeting Cloudflare R2
      const s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${Deno.env.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: Deno.env.get('R2_ACCESS_KEY')!,
          secretAccessKey: Deno.env.get('R2_SECRET_KEY')!,
        },
      });

      // Extract filename key from audioUrl
      let fileName: string;
      try {
        const url = new URL(audioUrl);
        fileName = url.pathname.split('/').pop() || '';
      } catch (e) {
        fileName = audioUrl.split('/').pop() || '';
      }

      if (!fileName) {
        return new Response(JSON.stringify({ error: 'Invalid audioUrl path' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Deleting ${fileName} from R2 bucket: ${Deno.env.get('R2_BUCKET_NAME')}...`);

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: Deno.env.get('R2_BUCKET_NAME')!,
          Key: fileName,
        })
      );

      return new Response(JSON.stringify({ success: true, message: 'Note deleted successfully' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Parse FormData Upload
    const formData = await req.formData();
    const audioFile = (formData.get('file') || formData.get('audio')) as File | null;
    const title = formData.get('title') as string | null;
    const waveform = formData.get('waveform') as string | null;
    const durationStr = formData.get('duration') as string | null;

    if (!audioFile || !title) {
      return new Response(JSON.stringify({ error: 'Missing audio file or title parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const durationSeconds = parseInt(durationStr || '0', 10);

    // 5. Initialize S3 Client targeting Cloudflare R2
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${Deno.env.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: Deno.env.get('R2_ACCESS_KEY')!,
        secretAccessKey: Deno.env.get('R2_SECRET_KEY')!,
      },
    });

    // 6. Upload Binary to Cloudflare R2 with dynamic content-type detection
    const contentType = audioFile.type || 'audio/webm';
    let fileExt = 'webm';
    
    if (audioFile.name && audioFile.name.includes('.')) {
      fileExt = audioFile.name.split('.').pop() || 'webm';
    } else if (contentType.includes('mp4') || contentType.includes('m4a')) {
      fileExt = 'm4a';
    } else if (contentType.includes('aac')) {
      fileExt = 'aac';
    } else if (contentType.includes('ogg')) {
      fileExt = 'ogg';
    }

    const fileName = `note-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now()}.${fileExt}`;
    const fileBuffer = await audioFile.arrayBuffer();

    console.log(`Uploading ${fileName} (${contentType}) to R2 bucket: ${Deno.env.get('R2_BUCKET_NAME')}...`);
    
    await s3Client.send(
      new PutObjectCommand({
        Bucket: Deno.env.get('R2_BUCKET_NAME')!,
        Key: fileName,
        Body: new Uint8Array(fileBuffer),
        ContentType: contentType,
      })
    );

    const publicUrlBase = Deno.env.get('R2_PUBLIC_URL')!.replace(/\/$/, '');
    const audioUrl = `${publicUrlBase}/${fileName}`;

    // 7. Insert note into Database
    console.log('Inserting note into DB with audioUrl:', audioUrl);
    const { data: note, error: insertError } = await supabaseClient
      .from('notes')
      .insert({
        user_id: user.id,
        title,
        audio_url: audioUrl,
        waveform_url: waveform || '[]',
        duration_seconds: durationSeconds,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insertion error:', insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, note }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Unexpected error in Edge Function:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
