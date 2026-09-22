export const EXTENSION_ZIP_PATH = "/snowbear-chrome-extension.zip";

export const EXTENSION_VERSION =
  import.meta.env.VITE_EXTENSION_VERSION?.trim() || "1.0.0";

export function extensionZipUrl(): string {
  return `${EXTENSION_ZIP_PATH}?v=${encodeURIComponent(EXTENSION_VERSION)}`;
}

export function downloadExtensionZip(): void {
  const link = document.createElement("a");
  link.href = extensionZipUrl();
  link.download = `snowbear-chrome-extension-v${EXTENSION_VERSION}.zip`;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}