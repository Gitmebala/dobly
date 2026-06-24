const SAFE_MIME_PREFIXES = ["image/", "audio/", "video/", "text/"];
const SAFE_MIME_TYPES = new Set([
  "application/json",
  "application/pdf",
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "model/gltf+json",
  "model/gltf-binary",
]);
const BLOCKED_EXTENSIONS = /\.(?:exe|dll|msi|com|scr|bat|cmd|ps1|sh|jar|app|dmg|iso|apk|deb|rpm)$/i;

export function validateUpload(file: File, options: { maxBytes: number; kind?: "artifact" | "audio" }) {
  if (!file.name || file.name.length > 220 || /[\u0000-\u001f]/.test(file.name)) {
    throw new Error("The file name is invalid.");
  }
  if (file.size <= 0) throw new Error("The uploaded file is empty.");
  if (file.size > options.maxBytes) throw new Error(`The file exceeds the ${Math.floor(options.maxBytes / 1024 / 1024)} MB limit.`);
  if (BLOCKED_EXTENSIONS.test(file.name)) throw new Error("Executable files are not accepted.");
  const mime = file.type.toLowerCase();
  if (options.kind === "audio" && !mime.startsWith("audio/")) throw new Error("A supported audio file is required.");
  if (options.kind !== "audio" && mime && !SAFE_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix)) && !SAFE_MIME_TYPES.has(mime)) {
    throw new Error("This file type is not supported.");
  }
}
