import { useState } from "react";
import { POLAR_BEAR_LOGO_URL } from "../constants/brand";

const LOGO_FALLBACKS = [POLAR_BEAR_LOGO_URL, "/polar-bear-logo.jpg"];

type LogoSize = "header" | "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<LogoSize, { wrapper: string; img: string }> = {
  header: { wrapper: "w-[64px] h-[64px]", img: "w-[64px] h-[64px] object-contain" },
  sm: { wrapper: "w-16 h-16", img: "w-16 h-16 object-contain" },
  md: { wrapper: "w-24 h-24", img: "w-24 h-24 object-contain" },
  lg: { wrapper: "w-32 h-32", img: "w-32 h-32 object-contain" },
  xl: { wrapper: "w-48 h-48 sm:w-52 sm:h-52", img: "w-full h-full object-contain" },
};

interface BrandLogoProps {
  size?: LogoSize;
  className?: string;
  alt?: string;
}

export default function BrandLogo({
  size = "md",
  className = "",
  alt = "SnowBear Logo",
}: BrandLogoProps) {
  const [srcIndex, setSrcIndex] = useState(0);
  const { wrapper, img } = sizeClasses[size];

  return (
    <div
      className={`${wrapper} shrink-0 flex items-center justify-center overflow-visible bg-transparent ${className}`}
    >
      <img
        src={LOGO_FALLBACKS[srcIndex]}
        alt={alt}
        className={`${img} bg-transparent`}
        style={{ background: "transparent" }}
        onError={() => {
          if (srcIndex < LOGO_FALLBACKS.length - 1) {
            setSrcIndex((prev) => prev + 1);
          }
        }}
      />
    </div>
  );
}