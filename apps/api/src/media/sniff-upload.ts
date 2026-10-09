const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "video/mp4",
]);

export function sniffUploadMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (buffer.length >= 6) {
    const gif = buffer.toString("ascii", 0, 6);
    if (gif === "GIF87a" || gif === "GIF89a") return "image/gif";
  }
  if (looksLikeHtmlOrSvg(buffer)) return null;
  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
    const brand = buffer.toString("ascii", 8, 12).toLowerCase().replace(/\0/g, "");
    if (["heic", "heix", "heif", "hevc", "hevx", "mif1", "msf1"].includes(brand)) {
      return "image/heic";
    }
    return "video/mp4";
  }
  return null;
}

export function assertAllowedUploadMime(mime: string | null) {
  if (!mime || !ALLOWED.has(mime)) {
    throw new Error("Use JPEG, PNG, WebP, HEIC, GIF, or MP4");
  }
  return mime;
}

function looksLikeHtmlOrSvg(buffer: Buffer) {
  const head = buffer
    .subarray(0, 256)
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .trimStart()
    .toLowerCase();
  return (
    head.startsWith("<svg") ||
    head.startsWith("<!doctype html") ||
    head.startsWith("<html") ||
    head.startsWith("<?xml")
  );
}
