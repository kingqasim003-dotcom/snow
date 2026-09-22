function imgbbApiKey(): string {
  if (process.env.IMGBB_API_KEY?.trim()) return process.env.IMGBB_API_KEY.trim();
  const encoded = process.env.IMGBB_API_KEY_B64?.trim();
  if (!encoded) return "";
  return Buffer.from(encoded, "base64").toString("utf8");
}

export async function uploadImageToImgbb(base64OrDataUrl: string, name?: string): Promise<string> {
  const apiKey = imgbbApiKey();
  if (!apiKey) {
    throw new Error("Receipt upload is not configured on the server.");
  }

  let image = base64OrDataUrl.trim();
  if (image.includes(",")) {
    image = image.split(",")[1] || image;
  }
  if (!image || image.length < 32) {
    throw new Error("Invalid image data.");
  }

  const body = new URLSearchParams();
  body.set("image", image);
  if (name) body.set("name", name.slice(0, 120));

  const res = await fetch(
    `https://api.imgbb.com/1/upload?expiration=600&key=${encodeURIComponent(apiKey)}`,
    { method: "POST", body }
  );

  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: { url?: string; display_url?: string };
    error?: { message?: string };
  };

  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || "Could not upload receipt image.");
  }

  return data.data?.url || data.data?.display_url || "";
}