import { useState } from "react";
import { safeExternalUrl } from "../../lib/discovery";

/** Handles blocked hosts, broken URLs, and missing artwork. */
export function GameImage({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = safeExternalUrl(src);
  return (
    <div className={`media-frame ${className}`}>
      <div className="media-fallback" aria-hidden="true">
        <span>CHECKPOINT / COLLECTION</span>
        <span>{alt}</span>
        <small>Artwork unavailable</small>
      </div>
      {url && failedUrl !== url && (
        <img
          src={url}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(url)}
        />
      )}
    </div>
  );
}
