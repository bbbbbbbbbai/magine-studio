import { createUuid } from "./uuid";

export const MAX_REFERENCE_IMAGES = 4;
export const MAX_REFERENCE_FILE_BYTES = 15 * 1024 * 1024;

export interface AttachedReference {
  id: string;
  name: string;
  dataUrl: string;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片读取失败"));
    };
    image.src = url;
  });
}

export async function prepareReferenceImage(
  file: File,
): Promise<AttachedReference> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("只支持 PNG、JPEG 或 WebP 图片");
  }
  if (file.size > MAX_REFERENCE_FILE_BYTES) {
    throw new Error("单张参考图不能超过 15 MB");
  }

  const image = await loadImage(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("浏览器无法处理这张图片");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return {
    id: createUuid(),
    name: file.name || "参考图",
    dataUrl: canvas.toDataURL("image/jpeg", 0.88),
  };
}
