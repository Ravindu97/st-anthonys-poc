import Image from "next/image";
import { BRAND_LOGO_PATH } from "@st-anthonys/shared/constants";
import { cn } from "../lib/cn";

export function BrandLogo({
  size = 40,
  showWordmark = false,
  className,
}: {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}) {
  const height = Math.round(size * (350 / 375));

  if (!showWordmark) {
    return (
      <Image
        src={BRAND_LOGO_PATH}
        alt="St. Anthony's"
        width={size}
        height={height}
        className={cn("shrink-0 rounded-md", className)}
        priority
      />
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src={BRAND_LOGO_PATH}
        alt="St. Anthony's"
        width={size}
        height={height}
        className="shrink-0 rounded-md"
        priority
      />
      <div className="leading-tight">
        <div className="text-base font-bold tracking-tight text-white">St. Anthony&apos;s</div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-amber">
          Charge Network
        </div>
      </div>
    </div>
  );
}
