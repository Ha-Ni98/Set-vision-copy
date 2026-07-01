import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function OtpStep({ onComplete }: { onComplete: () => void }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const setDigit = (i: number, v: string) => {
    const ch = v.replace(/\D/g, "").slice(0, 1);
    const next = [...digits];
    next[i] = ch;
    setDigits(next);
    if (ch && i < 5) refs.current[i + 1]?.focus();
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const submit = () => {
    if (digits.some((d) => !d)) return;
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); onComplete(); }, 1000);
  };

  return (
    <div className="space-y-6 text-center">
      <div>
        <h3 className="text-2xl font-bold text-foreground">OTP Verification Required</h3>
        <p className="mt-2 text-sm text-muted-foreground">A verification code was sent to your device. Enter it below.</p>
      </div>
      <div className="flex justify-center gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKey(i, e)}
            inputMode="numeric"
            maxLength={1}
            className="h-14 w-12 rounded-lg border-2 border-border bg-background text-center text-2xl font-bold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        ))}
      </div>
      <div>
        <Button onClick={submit} disabled={submitting || digits.some((d) => !d)} className="w-full sm:w-auto sm:min-w-[200px]">
          {submitting ? "Verifying..." : "Submit OTP"}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {countdown > 0 ? (
          <>Resend code in <span className="font-mono font-semibold text-foreground">{countdown}s</span></>
        ) : (
          <button onClick={() => setCountdown(60)} className="font-medium text-primary hover:underline">Resend Code</button>
        )}
      </p>
    </div>
  );
}
