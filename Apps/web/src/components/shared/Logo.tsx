import logo from "@/assets/setvision-logo.jpg";

export function Logo({ size = 32, withText = true, className = "" }: { size?: number; withText?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={logo}
        alt="Setvision"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="object-contain"
      />
      {withText && (
        <span className="font-extrabold tracking-tight text-foreground" style={{ fontSize: size * 0.55 }}>
          SETVISION
        </span>
      )}
    </div>
  );
}
