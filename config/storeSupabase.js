// supabaseStorage.js
import fs from "fs";
import path from "path";
import { supabase } from "../services/supabaseClient.js";
import dotenv from "dotenv";

dotenv.config();

const BUCKET_NAME = process.env.SUPABASE_BUCKET;

if (!BUCKET_NAME) {
  throw new Error("SUPABASE_BUCKET is missing in .env");
}

// -----------------------------
// Utils: short filename
// -----------------------------
const generateShortFileName = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();

  const base = path
    .basename(filePath, ext)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 10);

  const unique = Date.now().toString(36); // short unique id

  return `${base}-${unique}${ext}`;
};

// -----------------------------
// Upload function
// -----------------------------
export async function uploadToSupabase(localFilePath, folder = "uploads") {
  if (!fs.existsSync(localFilePath)) {
    throw new Error("File does not exist: " + localFilePath);
  }

  const allowedExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
  const ext = path.extname(localFilePath).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    throw new Error("Invalid file type. Only images are allowed.");
  }

  // ✅ short clean filename
  const fileName = generateShortFileName(localFilePath);
  const filePathInBucket = `${folder}/${fileName}`;

  const fileStream = fs.createReadStream(localFilePath);

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePathInBucket, fileStream, {
      cacheControl: "3600",
      upsert: false,
      contentType: `image/${ext.replace(".", "")}`,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePathInBucket);

  return data.publicUrl;
}