import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { ClientActivationStatus } from "@my-app/contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StepIndicator } from "@/components/sections/landing/StepIndicator";
import { CompletedStep } from "@/components/sections/landing/CompletedStep";
import { FailedStep } from "@/components/sections/landing/FailedStep";
import { UnderReviewStep } from "@/components/sections/landing/UnderReviewStep";
import { SupportBanner } from "@/components/sections/landing/SupportBanner";
import { CheckAnotherKeyButton } from "@/components/sections/landing/CheckAnotherKeyButton";
import { StatsRow } from "@/components/sections/landing/StatsRow";
import { WhoWeAre } from "@/components/sections/landing/WhoWeAre";
import { getPlanForm } from "@/components/sections/landing/plan-forms";
import { useVerifyKey } from "@/hooks/useVerifyKey";
import { useActivationStatus } from "@/hooks/useActivationStatus";
import { useActivation } from "@/components/providers/ActivationProvider";
import { AlertCircle, KeyRound, Loader2, MessageCircle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { SOCIAL_LINKS } from "@/config/social-links";

// Matches the Step 1 input's own placeholder shape (spec: "XXXX-XXXX") — the contract has no
// fixed key-generation format to validate against, so this is only a soft client-side shape
// check; the backend's verify response (INVALID) is the real authority.
 //const KEY_FORMAT_PATTERN = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const KEY_FORMAT_PATTERN = /^[A-Z0-9]{8}$/;

type StepView = "keyEntry" | "form" | "otp" | "review" | "activated" | "failed";

const STEP_FOR_VIEW: Record<StepView, 1 | 2 | 3> = {
  keyEntry: 1,
  form: 2,
  otp: 3,
  review: 3,
  activated: 3,
  failed: 3,
};

// No further status changes are ever expected once here — the status query stays disabled
// rather than polling/re-subscribing an activation that's already reached its end state.
const TERMINAL_STATUSES = new Set<ClientActivationStatus>([
  ClientActivationStatus.ACTIVATED,
  ClientActivationStatus.FAILED,
]);

// Total over ClientActivationStatus's 9 members (client-portal plan.md §D2) — this exact
// mapping is what Sprint 4's realtime re-dispatch reuses, so it must stay a pure function of
// `status` alone. PROCESSING stays routed to "form": AccountForm's own read-only D-variant
// (Sprint 2) already covers it, matching plan.md §D3's combined "Processing/Under-review"
// label — the same reading Sprint 2 already used to route UNDER_REVIEW to Step 3 instead.
// The OTP API also resolves back to PROCESSING (spec §Step 3A), so a correct OTP submission
// revisits this same Step-2 view rather than advancing to Step 3 — an accepted quirk given
// the spec's own "Step 2/Step 3" hedge for this status, not a bug.
function viewForStatus(status: ClientActivationStatus): StepView {
  switch (status) {
    case ClientActivationStatus.INVALID:
      return "keyEntry";
    case ClientActivationStatus.READY:
    case ClientActivationStatus.SUBMITTED:
    case ClientActivationStatus.PROCESSING:
    case ClientActivationStatus.NEEDS_CORRECTION:
      return "form";
    case ClientActivationStatus.NEEDS_OTP:
      return "otp";
    case ClientActivationStatus.UNDER_REVIEW:
      return "review";
    case ClientActivationStatus.ACTIVATED:
      return "activated";
    case ClientActivationStatus.FAILED:
      return "failed";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export default function LandingPage() {
  const { t } = useTranslation();
  const { activation, setActivation, resetToken } = useActivation();
  const [input, setInput] = useState("");
  const [clientErrorKey, setClientErrorKey] = useState<string | null>(null);
  const [serverErrorKey, setServerErrorKey] = useState<string | null>(null);
  const verifyKey = useVerifyKey();

  const view = useMemo(
    () => (activation ? viewForStatus(activation.status) : "keyEntry"),
    [activation],
  );
  const currentStep = STEP_FOR_VIEW[view];
  const isInvalid = activation?.status === ClientActivationStatus.INVALID;
  // Shown once a REAL key is accepted, on every view except Finish (set-12-plan §1.2/§1.3).
  //  · activation !== null   → nothing has been verified yet (first load, or after a reset)
  //  · status !== INVALID    → verify() returns 200/INVALID for an unknown/inactive card, so a
  //                           non-null activation is NOT proof of a valid key
  //  · view !== "activated"  → CompletedStep is the Finish step
  const showSupportBanner = activation !== null && !isInvalid && view !== "activated";
  const { FormComponent, AdditionalInfoComponent } = useMemo(
    () => getPlanForm(activation?.planKey),
    [activation?.planKey],
  );

  // The realtime backbone (client-portal plan.md §D5): the `/client` socket only invalidates
  // this query (lib/realtime.ts's attachClientNamespaceListeners) — it never carries data
  // itself — so this is the one place a status change actually gets (re-)fetched, whether
  // that invalidation came from a live event, the window-focus refetch, or the polling
  // fallback (all configured on the hook itself). Disabled once a terminal status is reached.
  const activationId = activation?.activationId;
  const statusQuery = useActivationStatus(
    activationId,
    !!activationId && !TERMINAL_STATUSES.has(activation!.status),
  );

  // Re-verifies instead of just folding in a new status — used by BOTH the realtime poll
  // below AND Step 2/3's own submit/update/OTP mutation successes (Stage-04-fix #4A/#4B).
  // Every one of those only ever hands back `{activationId, status}` (submit/update/additional
  // included — same contract gap `useActivationStatus` has), and the "form" view's remount
  // (keyed on status, below) recomputes its defaultValues from whatever's in context at that
  // moment: a bare status swap left clientFullName/submittedFields stale or entirely unset
  // (a fresh READY→SUBMITTED transition never had them at all), so the very next time this
  // view was shown it prefilled blank instead of what the client just typed and saved.
  const refreshAfterStatusChange = (result: { status: ClientActivationStatus; activationId?: string }) => {
    if (!activation || result.status === activation.status) return;
    const key = activation.key;
    verifyKey.mutate({ key }, { onSuccess: (data) => setActivation({ ...data, key }) });
  };

  // Plain state sync, not a fetch — the fetch already happened inside useActivationStatus's
  // own useQuery; this only reacts to its result once it actually changes. Mirrors
  // LanguageProvider's `dir` effect syncing external state into local state.
  useEffect(() => {
    if (activation && statusQuery.data && statusQuery.data.activationId === activation.activationId) {
      refreshAfterStatusChange(statusQuery.data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusQuery.data]);

  // Mirrors "Check Another Key" and the header logo's reset (both live outside this
  // component, calling ActivationContext's own reset) onto this page's local Step-1 ui
  // state — keyed on `resetToken`, not `activation`, since a reset clicked while still on
  // Step 1 (typed input, never successfully verified) is a null→null update that would
  // never re-run an effect keyed on `activation` itself. Plain state sync, not a fetch —
  // same pattern as LanguageProvider's `dir` effect.
  useEffect(() => {
    setInput("");
    setClientErrorKey(null);
    setServerErrorKey(null);
  }, [resetToken]);

  // Focus management on step transitions (Sprint 5 a11y): move focus to the card whenever
  // the view actually changes, so screen-reader/keyboard users are told the content changed
  // instead of focus silently staying on a button that may have just disappeared. Skipped on
  // first mount so it doesn't fight the Step-1 input's own `autoFocus`.
  const cardRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    cardRef.current?.focus();
  }, [view]);

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input;
    setServerErrorKey(null);
    if (!trimmed) {
      setClientErrorKey("public.landing.verify.emptyKey");
      return;
    }
    if (!KEY_FORMAT_PATTERN.test(trimmed)) {
      setClientErrorKey("public.landing.verify.badFormat");
      return;
    }
    setClientErrorKey(null);
    verifyKey.mutate(
      { key: trimmed },
      {
        onSuccess: (data) => setActivation({ ...data, key: trimmed }),
        onError: (err) => {
          setServerErrorKey(
            axios.isAxiosError(err) && !err.response
              ? "public.landing.verify.networkError"
              : "public.landing.serverError",
          );
        },
      },
    );
  };

  const inputErrorMessage = clientErrorKey
    ? t(clientErrorKey)
    : serverErrorKey
      ? t(serverErrorKey)
      : isInvalid
        ? t("public.landing.message.invalidBody")
        : null;

  return (
    <>
      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <div className="mb-10">
          <StepIndicator current={currentStep} />
        </div>

        {showSupportBanner && (
          <div className="mb-6 text-center">
          <SupportBanner />
          </div>
          )}

        <div
          ref={cardRef}
          tabIndex={-1}
          className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] focus:outline-none sm:p-8"
        >
          {view === "keyEntry" && (
            <form onSubmit={verify} className="space-y-5 text-center">
              <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary">
                <KeyRound className="h-7 w-7" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                {t("public.landing.verify.title")}
              </h1>
              <p className="text-muted-foreground">{t("public.landing.verify.subtitle")}</p>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                placeholder={t("public.landing.verify.placeholder")}
                disabled={verifyKey.isPending}
                className={cn(
                  "h-14 text-center text-lg tracking-widest font-mono",
                  inputErrorMessage && "border-destructive focus-visible:ring-destructive",
                )}
                aria-invalid={!!inputErrorMessage}
                autoFocus
              />
              {inputErrorMessage && (
                <p
                  role="alert"
                  className="flex items-center justify-center gap-1.5 text-sm text-destructive"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" /> {inputErrorMessage}
                </p>
              )}
              {(isInvalid || serverErrorKey === "public.landing.serverError") && (
                <a
                  href={SOCIAL_LINKS.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <MessageCircle className="h-4 w-4" /> {t("common.actions.contactWhatsapp")}
                </a>
              )}
              <Button
                type="submit"
                disabled={verifyKey.isPending}
                className="h-12 w-full text-base sm:w-auto sm:min-w-[220px]"
              >
                {verifyKey.isPending ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />{" "}
                    {t("public.landing.verify.verifying")}
                  </>
                ) : (
                  t("public.landing.verify.submit")
                )}
              </Button>
            </form>
          )}

          {view === "form" && activation && (
            // Keyed on status too (Stage-04-fix #4B): a live transition into this same view
            // (e.g. SUBMITTED → NEEDS_CORRECTION) must remount the form so its `editing`/
            // defaultValues re-initialize from the freshly re-verified keyData, instead of
            // staying stuck on whatever they were computed as at the previous status.
            <FormComponent
              key={`${activation.key}-${activation.status}`}
              keyData={activation}
              onSubmitted={refreshAfterStatusChange}
            />
          )}

          {view === "otp" && activation && (
            <AdditionalInfoComponent
              activationId={activation.activationId}
              onSuccess={refreshAfterStatusChange}
            />
          )}

          {view === "review" && <UnderReviewStep />}
          {view === "activated" && <CompletedStep username={activation?.accountUsername} />}
          {view === "failed" && <FailedStep />}
        </div>

        <div className="mt-6 text-center">
          <CheckAnotherKeyButton />
        </div>
      </section>

      <WhoWeAre />
      <StatsRow />
    </>
  );
}
