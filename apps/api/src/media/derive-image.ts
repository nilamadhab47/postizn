import sharp from "sharp";
import { cropChip, type CropRecipe } from "@postn/shared";

export function clampExtract(
  crop: CropRecipe["crop"],
  imageWidth: number,
  imageHeight: number,
) {
  let left = Math.round(crop.x);
  let top = Math.round(crop.y);
  let width = Math.round(crop.width);
  let height = Math.round(crop.height);
  if (left < 0) {
    width += left;
    left = 0;
  }
  if (top < 0) {
    height += top;
    top = 0;
  }
  width = Math.min(width, imageWidth - left);
  height = Math.min(height, imageHeight - top);
  if (width < 1 || height < 1) {
    throw new Error("Crop is outside the photo");
  }
  return { left, top, width, height };
}

/** Match the cropper: EXIF → user rotate → flip → extract → scale down, never up. */
export async function bakeDerivedJpeg(input: Buffer, recipe: CropRecipe) {
  const chip = cropChip(recipe.aspect);
  const rotation = ((Math.round(recipe.rotation) % 360) + 360) % 360;
  let oriented = sharp(input).rotate();
  if (rotation) {
    oriented = oriented.rotate(rotation, {
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    });
  }
  const rotated = await oriented.toBuffer();
  let prepared = rotated;
  if (recipe.flipX || recipe.flipY) {
    let flipped = sharp(rotated);
    if (recipe.flipX) flipped = flipped.flop();
    if (recipe.flipY) flipped = flipped.flip();
    prepared = await flipped.toBuffer();
  }
  const meta = await sharp(prepared).metadata();
  const imageWidth = meta.width ?? 0;
  const imageHeight = meta.height ?? 0;
  const region = clampExtract(recipe.crop, imageWidth, imageHeight);
  return sharp(prepared)
    .extract(region)
    .resize(chip.bakeWidth, chip.bakeHeight, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}
