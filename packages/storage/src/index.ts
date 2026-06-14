import type { SupabaseClient } from "@supabase/supabase-js";

export type UploadFileInput = {
  bucket: string;
  path: string;
  file: Buffer;
  contentType: string;
  upsert?: boolean;
};

export async function uploadFile(
  supabase: SupabaseClient,
  input: UploadFileInput,
): Promise<string> {
  const { error } = await supabase.storage
    .from(input.bucket)
    .upload(input.path, input.file, {
      contentType: input.contentType,
      upsert: input.upsert ?? true,
    });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(input.bucket).getPublicUrl(input.path);
  return data.publicUrl;
}

export async function createSignedUrl(
  supabase: SupabaseClient,
  input: { bucket: string; path: string; expiresInSeconds?: number },
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(input.bucket)
    .createSignedUrl(input.path, input.expiresInSeconds ?? 3600);

  if (error) throw new Error(error.message);
  if (!data?.signedUrl) throw new Error("Signed URL not returned");
  return data.signedUrl;
}
