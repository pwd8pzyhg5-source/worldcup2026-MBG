interface FlagProps {
  code: string; // ISO 3166-1 alpha-2 country code
  size?: number;
  className?: string;
  title?: string;
}

export default function Flag({ code, size = 24, className = "", title }: FlagProps) {
  // Special case for England
  const cdnCode = code === "gb-eng" ? "gb-eng" : code.toLowerCase();
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/${size}x${Math.round(size * 0.75)}/${cdnCode}.png`}
      srcSet={`https://flagcdn.com/${size * 2}x${Math.round(size * 1.5)}/${cdnCode}.png 2x`}
      width={size}
      height={Math.round(size * 0.75)}
      alt={title || code}
      title={title}
      className={className}
      style={{ objectFit: "cover", borderRadius: 2, display: "inline-block" }}
    />
  );
}
