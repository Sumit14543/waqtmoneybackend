import { useState } from "react";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

const LOGO_SOURCES = ["/waqt-money-logo-imgg.png", "/waqt-money-logo-img.png", "/logo1.png"];

const BrandLogo = ({ className = "h-10 w-auto", priority = false }: BrandLogoProps) => {
  const [sourceIndex, setSourceIndex] = useState(0);

  return (
    <img
      src={LOGO_SOURCES[sourceIndex]}
      alt="Waqt Money"
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => {
        setSourceIndex((current) => Math.min(current + 1, LOGO_SOURCES.length - 1));
      }}
    />
  );
};

export default BrandLogo;
