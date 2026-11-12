import { ImageOff } from "lucide-react";
import { useEffect, useState } from "react";

interface ReferenceImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function ReferenceImage({
  src,
  alt,
  className,
}: ReferenceImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <span className={`reference-image-fallback ${className || ""}`}>
        <ImageOff size={22} />
        <small>素材暂不可用</small>
      </span>
    );
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
