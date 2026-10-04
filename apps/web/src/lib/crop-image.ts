function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Could not read that photo")));
    image.src = src;
  });
}

function radian(deg: number) {
  return (deg * Math.PI) / 180;
}

function rotatedBox(width: number, height: number, rotation: number) {
  const rad = radian(rotation);
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
}

/** Bitmap the cropper sees: EXIF is already in the blob; apply user rotate, then flip. */
export async function transformPreview(
  src: string,
  rotation: number,
  flipX: boolean,
): Promise<string> {
  const deg = ((Math.round(rotation) % 360) + 360) % 360;
  if (deg === 0 && !flipX) return src;

  const image = await loadImage(src);
  const box = rotatedBox(image.naturalWidth, image.naturalHeight, deg);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(box.width));
  canvas.height = Math.max(1, Math.round(box.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not rotate that photo");

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(radian(deg));
  ctx.scale(flipX ? -1 : 1, 1);
  ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((file) => resolve(file), "image/jpeg", 0.95);
  });
  if (!blob) throw new Error("Could not rotate that photo");
  return URL.createObjectURL(blob);
}

export function naturalPixels(
  crop: { x: number; y: number; width: number; height: number; unit: "%" | "px" },
  naturalWidth: number,
  naturalHeight: number,
) {
  if (crop.unit === "px") {
    return { x: crop.x, y: crop.y, width: crop.width, height: crop.height };
  }
  return {
    x: (crop.x / 100) * naturalWidth,
    y: (crop.y / 100) * naturalHeight,
    width: (crop.width / 100) * naturalWidth,
    height: (crop.height / 100) * naturalHeight,
  };
}
