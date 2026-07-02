import { useEffect, useState } from "react";
import { AccountInformation } from "@my-app/contract";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useSubmitAdditionalInfo } from "@/hooks/useSubmitAdditionalInfo";
import { useTranslation } from "@/hooks/useTranslation";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

interface Props {
  activationId: string | undefined;
  onComplete: () => void;
}

export function OtpStep({ activationId, onComplete }: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN_SECONDS);
  const submitAdditionalInfo = useSubmitAdditionalInfo();

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const submit = () => {
    if (value.length < OTP_LENGTH || !activationId) return;
    submitAdditionalInfo.mutate(
      { activationId, command: { accountFields: [{ field: AccountInformation.OTP, value }] } },
      { onSuccess: onComplete },
    );
  };

  return (
    <div className="space-y-6 text-center">
      <div>
        <h3 className="text-2xl font-bold text-foreground">{t("public.landing.otp.title")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t("public.landing.otp.body")}</p>
      </div>
      <div className="flex justify-center">
        <InputOTP maxLength={OTP_LENGTH} value={value} onChange={setValue}>
          <InputOTPGroup>
            {Array.from({ length: OTP_LENGTH }, (_, i) => (
              <InputOTPSlot key={i} index={i} className="h-14 w-12 text-2xl font-bold" />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
      <div>
        <Button onClick={submit} disabled={submitAdditionalInfo.isPending || value.length < OTP_LENGTH} className="w-full sm:w-auto sm:min-w-[200px]">
          {submitAdditionalInfo.isPending ? t("public.landing.otp.verifying") : t("public.landing.otp.submit")}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {countdown > 0 ? (
          t("public.landing.otp.resendIn", { seconds: countdown })
        ) : (
          <button onClick={() => setCountdown(RESEND_COOLDOWN_SECONDS)} className="font-medium text-primary hover:underline">
            {t("public.landing.otp.resend")}
          </button>
        )}
      </p>
    </div>
  );
}
