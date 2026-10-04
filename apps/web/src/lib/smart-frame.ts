import { convertToPercentCrop, type PercentCrop } from "react-image-crop";
import smartcrop from "smartcrop";

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Could not read that photo")));
    image.src = src;
  });
}

export async function smartFrameBox(imageSrc: string, ratio: number): Promise<PercentCrop> {
  const image = await loadImage(imageSrc);
  const width = 100;
  const height = Math.max(1, Math.round(width / Math.max(ratio, 0.01)));
  const { topCrop } = await smartcrop.crop(image, {
    width,
    height,
    minScale: 0.7,
  });
  return convertToPercentCrop(
    {
      unit: "px",
      x: topCrop.x,
      y: topCrop.y,
      width: topCrop.width,
      height: topCrop.height,
    },
    image.naturalWidth,
    image.naturalHeight,
  );
}
