import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export function LiveTimer({ since, mode = "elapsed" }: { since: string; mode?: "elapsed" | "wait" }) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Date.now() - new Date(since).getTime();
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  const text = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  const minutes = total / 60;
  const color = mode === "wait"
    ? minutes < 5 ? "text-success" : minutes < 15 ? "text-warning" : "text-destructive"
    : minutes < 5 ? "text-success" : minutes < 10 ? "text-warning" : "text-destructive";

  return (
    <span className={`inline-flex items-center gap-1 font-mono text-sm font-semibold ${color}`}>
      <Clock className="h-3.5 w-3.5" /> {text}
    </span>
  );
}
