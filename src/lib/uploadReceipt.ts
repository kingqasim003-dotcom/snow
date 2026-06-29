const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function readReceiptFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ALLOWED_TYPES.has(file.type)) {
      reject(new Error("Upload a JPG, PNG, WebP, or GIF screenshot."));
      return;
    }
    if (file.size > MAX_BYTES) {
      reject(new Error("Image must be under 5 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read image."));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
}

export async function uploadReceiptImage(dataUrl: string, name?: string): Promise<string> {
  const res = await fetch("/api/upload-receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: dataUrl, name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok || !data?.url) {
    throw new Error(data?.error || "Could not upload receipt.");
  }
  return data.url as string;
}