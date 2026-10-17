import type { ReactNode } from "react";
import { safeExternalUrl } from "../../lib/discovery";

export function ExternalLink({
  href,
  children,
  className,
  ariaLabel,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const url = safeExternalUrl(href);
  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={ariaLabel ? `${ariaLabel} (opens in a new tab)` : undefined}
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  ) : null;
}
