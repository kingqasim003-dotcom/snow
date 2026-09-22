import { useEffect } from "react";

interface PageMeta {
  title: string;
  description: string;
  path?: string;
}

const SITE = "https://www.snowbear.online";

export function usePageMeta({ title, description, path = "" }: PageMeta) {
  useEffect(() => {
    document.title = title;

    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `${SITE}${path || "/"}`;
  }, [title, description, path]);
}