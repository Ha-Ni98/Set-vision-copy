import { useEffect, useState } from "react";
import axios from "axios";
import { AccountInformation } from "@my-app/contract";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AlertCircle } from "lucide-react";
import { useSubmitAdditionalInfo } from "@/hooks/useSubmitAdditionalInfo";
import { useTranslation } from "@/hooks/useTranslation";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;
// Spec (client-portal Step 3A): "max 5 incorrect attempts → temporary lockout." This is a
// client-side early-warning counter, not the enforcement itself — the backend is the actual
// rate limiter; a network/5xx failure never counts against it (spec: "network fail → retry
// with preserved input"), only a resolved wrong-code response does.
const MAX_ATTEMPTS = 5;

interface Props {
  activationId: string | undefined;
  onComplete: () => void;
}

export function OtpStep({ activationId, onComplete }: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN_SECONDS);
  const [attempts, setAttempts] = useState(0);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const submitAdditionalInfo = useSubmitAdditionalInfo();

  const lockedOut = attempts >= MAX_ATTEMPTS;

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const submit = () => {
    if (value.length < OTP_LENGTH || !activationId || lockedOut) return;
    setErrorKey(null);
    submitAdditionalInfo.mutate(
      { activationId, command: { accountFields: [{ field: AccountInformation.OTP, value }] } },
      {
        onSuccess: onComplete,
        onError: (err) => {
          // A network/5xx failure preserves the entered code and doesn't count as a wrong
          // attempt — only a resolved (wrong-code) response from the server does.
          if (axios.isAxiosError(err) && !err.response) {
            setErrorKey("public.landing.otp.networkError");
            return;
          }
          const next = attempts + 1;
          setAttempts(next);
          setValue("");
          setErrorKey(
            next >= MAX_ATTEMPTS ? "public.landing.otp.lockout" : "public.landing.otp.wrongCode",
          );
        },
      },
    );
  };

  return (
    <div className="space-y-6 text-center">
      <div>
        <h3 className="text-2xl font-bold text-foreground">{t("public.landing.otp.title")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t("public.landing.otp.body")}</p>
      </div>
      <div className="flex justify-center">
        <InputOTP
          maxLength={OTP_LENGTH}
          value={value}
          onChange={setValue}
          disabled={submitAdditionalInfo.isPending || lockedOut}
        >
          <InputOTPGroup>
            {Array.from({ length: OTP_LENGTH }, (_, i) => (
              <InputOTPSlot key={i} index={i} className="h-14 w-12 text-2xl font-bold" />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
      {errorKey && (
        <p
          role="alert"
          className="flex items-center justify-center gap-1.5 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" /> {t(errorKey)}
        </p>
      )}
      {!lockedOut && attempts > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("public.landing.otp.attemptsRemaining", { count: MAX_ATTEMPTS - attempts })}
        </p>
      )}
      <div>
        <Button
          onClick={submit}
          disabled={submitAdditionalInfo.isPending || value.length < OTP_LENGTH || lockedOut}
          className="w-full sm:w-auto sm:min-w-[200px]"
        >
          {submitAdditionalInfo.isPending
            ? t("public.landing.otp.verifying")
            : t("public.landing.otp.submit")}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {countdown > 0 ? (
          t("public.landing.otp.resendIn", { seconds: countdown })
        ) : (
          <button
            type="button"
            disabled={lockedOut}
            onClick={() => setCountdown(RESEND_COOLDOWN_SECONDS)}
            className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("public.landing.otp.resend")}
          </button>
        )}
      </p>
    </div>
  );
}
