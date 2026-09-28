import Image from "next/image";

const SIZES = {
  sm: { icon: 28, text: "text-lg" },
  md: { icon: 36, text: "text-2xl" },
  lg: { icon: 48, text: "text-3xl" },
} as const;

type LogoProps = {
  size?: keyof typeof SIZES;
  className?: string;
};

export function Logo({ size = "md", className }: LogoProps) {
  const { icon, text } = SIZES[size];

  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <Image
        src="/logo/gliconexo-mark-v2.svg"
        alt=""
        width={icon}
        height={icon}
        priority
      />
      <span className={`font-extrabold tracking-tight ${text}`}>
        <span className="text-foreground">Glico</span>
        <span className="text-brand-teal">Nexo</span>
      </span>
    </span>
  );
}
