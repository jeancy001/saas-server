
import { supabase } from "../config/supabase.js";

const BUCKET_NAME = process.env.SUPABASE_BUCKET;

if (!BUCKET_NAME) {
  throw new Error("SUPABASE_BUCKET is not defined in env");
}

/**
 * Upload image to Supabase Storage
 */
export const uploadImage = async (
  file,
  folder = "", // optional folder inside bucket
  isPublic = true
) => {
  if (!file) throw new Error("File is required");

  const safeFileName = file.originalname.replace(/\s+/g, "_");

  const filePath = folder
    ? `${folder}/${Date.now()}_${safeFileName}`
    : `${Date.now()}_${safeFileName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) throw new Error(error.message);

  // Public URL
  if (isPublic) {
    const { data: publicData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return {
      url: publicData.publicUrl,
      path: data.path,
    };
  }

  // Signed URL (private)
  const { data: signedData, error: signedError } =
    await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(data.path, 60 * 60);

  if (signedError) throw new Error(signedError.message);

  return {
    url: signedData.signedUrl,
    path: data.path,
  };
};

/**
 * Delete image from Supabase
 */
export const deleteImage = async (imageUrlOrPath) => {
  if (!imageUrlOrPath) return;

  try {
    let path = imageUrlOrPath;

    // Extract path if full URL
    if (imageUrlOrPath.includes("/storage/v1/object/")) {
      const parts = imageUrlOrPath.split(`/${BUCKET_NAME}/`);
      path = parts[1];
    }

    if (!path) return;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) throw new Error(error.message);

    return true;
  } catch (err) {
    console.error("Delete image error:", err.message);
    return false;
  }
};