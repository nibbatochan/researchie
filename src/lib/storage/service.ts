import { supabaseAdmin } from '@/lib/supabase/admin';
import { AUTH_REQUIRED } from '@/lib/auth/server';

export interface StorageResult {
  url: string;
  storageProvider: 'supabase' | 'data_url';
}

export async function uploadAsset(
  base64Data: string,
  fileName: string,
  contentType: string = 'image/png'
): Promise<StorageResult> {
  // Local development keeps the picture inside the clip. Only the accounts deployment tries a Supabase bucket,
  // so local use never writes to a Supabase project.
  if (!AUTH_REQUIRED) return { url: base64Data, storageProvider: 'data_url' };

  // If Supabase is available, attempt upload to research-assets bucket
  try {
    const buffer = Buffer.from(
      base64Data.replace(/^data:image\/\w+;base64,/, ''),
      'base64'
    );

    const filePath = `uploads/${Date.now()}-${fileName}`;
    const { data, error } = await supabaseAdmin.storage
      .from('research-assets')
      .upload(filePath, buffer, {
        contentType,
        upsert: true,
      });

    if (!error && data) {
      const { data: publicUrlData } = supabaseAdmin.storage
        .from('research-assets')
        .getPublicUrl(filePath);

      return {
        url: publicUrlData.publicUrl,
        storageProvider: 'supabase',
      };
    }
  } catch {
    // Graceful fallback to inline data URL
  }

  return {
    url: base64Data,
    storageProvider: 'data_url',
  };
}
