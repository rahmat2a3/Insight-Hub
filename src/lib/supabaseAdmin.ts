import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Warning: Supabase Admin URL or Service Role Key is not configured.')
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper untuk upload buffer ke Supabase Storage
export async function uploadToSupabase(
  bucket: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  try {
    // Coba buat bucket jika belum ada (abaikan jika sudah ada)
    await supabaseAdmin.storage.createBucket(bucket, { public: true });
  } catch {
    // Ignore error
  }

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(fileName, buffer, {
      contentType: mimeType,
      upsert: true
    });

  if (error) {
    console.error(`[Supabase Storage] Upload error to bucket ${bucket}:`, error);
    throw error;
  }

  const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(fileName);
  return urlData.publicUrl;
}

// Helper untuk mendownload file dari URL menjadi Buffer
export async function fetchBufferFromUrl(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch file from URL: ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}



