import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AUTH_REQUIRED } from '@/lib/auth/server';
import { makeFailureLimiter } from '@/lib/auth/rateLimit';
import { parseImageDataUrl } from './imageData';

export interface StorageResult {
  url: string;
  storageProvider: 'supabase' | 'data_url';
}

// The bucket is public, so what goes in is limited: raster images only, 4 MB each, and a number per person per
// hour (per server instance). Past the limit the picture stays inline in the clip, as it does locally.
const uploads = makeFailureLimiter(60, 60 * 60 * 1000);

/** Stores one inline image for this user. The caller has already checked the user may add to the project. */
export async function uploadAsset(userId: string, dataUrl: string): Promise<StorageResult> {
  const inline: StorageResult = { url: dataUrl, storageProvider: 'data_url' };
  // Local development keeps the picture inside the clip. Only the accounts deployment tries a Supabase bucket,
  // so local use never writes to a Supabase project.
  if (!AUTH_REQUIRED) return inline;

  const image = parseImageDataUrl(dataUrl);
  if (!image || !userId || uploads.blocked(userId)) return inline;

  try {
    // A random name under the user's own folder: nothing is overwritten and the owner can be told from the path.
    const filePath = `uploads/${userId}/${randomUUID()}.${image.ext}`;
    const { data, error } = await supabaseAdmin.storage
      .from('research-assets')
      .upload(filePath, Buffer.from(image.base64, 'base64'), { contentType: image.contentType, upsert: false });

    if (!error && data) {
      uploads.fail(userId);
      const { data: publicUrlData } = supabaseAdmin.storage.from('research-assets').getPublicUrl(filePath);
      return { url: publicUrlData.publicUrl, storageProvider: 'supabase' };
    }
  } catch {
    // Graceful fallback to inline data URL
  }

  return inline;
}
