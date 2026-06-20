interface ParticipantAvatarProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

export function participantPhotoSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
}

export default function ParticipantAvatar({ name, size = 32, color = "#666", className = "" }: ParticipantAvatarProps) {
  const slug = participantPhotoSlug(name);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/images/participants/${slug}.png`}
      alt=""
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: "50%", objectFit: "cover", border: `2px solid ${color}`, flexShrink: 0, display: "inline-block" }}
      onError={(e) => {
        (e.target as HTMLImageElement).style.visibility = "hidden";
      }}
    />
  );
}
