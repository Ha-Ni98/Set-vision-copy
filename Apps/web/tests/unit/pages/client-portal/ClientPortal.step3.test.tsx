import "../../../fixtures/wrappers/mockTranslation";
import "./support/mockHooks";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountInformation, type KeyVerificationDTO } from "@my-app/contract";
import * as useVerifyKeyHook from "@/hooks/useVerifyKey";
import * as useActivationStatusHook from "@/hooks/useActivationStatus";
import * as useSubmitActivationHook from "@/hooks/useSubmitActivation";
import * as useUpdateActivationHook from "@/hooks/useUpdateActivation";
import * as useSubmitAdditionalInfoHook from "@/hooks/useSubmitAdditionalInfo";
import { renderLandingPage } from "./support/renderLandingPage";
import { OtpStep } from "@/components/sections/landing/OtpStep";
import { mutationMock, statusQueryMock } from "./support/testHelpers";
import {
  mockKeyNeedsOtp,
  mockKeyUnderReview,
  mockKeyActivated,
  mockKeyFailed,
} from "../../../fixtures/data/keys.mock";

const KEY_PLACEHOLDER = "public.landing.verify.placeholder";
const SUBMIT_BUTTON = "public.landing.verify.submit";
const OTP_LABEL = "public.landing.otp.inputLabel";
const VALID_KEY = "ABCD-1234-EFGH-5678";

let verifyMutate: ReturnType<typeof vi.fn>;
let otpMutate: ReturnType<typeof vi.fn>;

function verifyResolvesWith(data: KeyVerificationDTO) {
  verifyMutate.mockImplementation(
    (_vars: unknown, opts?: { onSuccess?: (d: KeyVerificationDTO) => void }) =>
      opts?.onSuccess?.(data),
  );
}

async function seedView(user: ReturnType<typeof userEvent.setup>, dto: KeyVerificationDTO) {
  verifyResolvesWith(dto);
  renderLandingPage();
  await user.type(screen.getByPlaceholderText(KEY_PLACEHOLDER), VALID_KEY);
  await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON }));
}

beforeEach(() => {
  vi.clearAllMocks();
  const verify = mutationMock();
  verifyMutate = verify.mutate;
  vi.mocked(useVerifyKeyHook.useVerifyKey).mockReturnValue(verify as never);
  vi.mocked(useActivationStatusHook.useActivationStatus).mockReturnValue(
    statusQueryMock() as never,
  );
  vi.mocked(useSubmitActivationHook.useSubmitActivation).mockReturnValue(mutationMock() as never);
  vi.mocked(useUpdateActivationHook.useUpdateActivation).mockReturnValue(mutationMock() as never);

  const otp = mutationMock();
  otpMutate = otp.mutate;
  vi.mocked(useSubmitAdditionalInfoHook.useSubmitAdditionalInfo).mockReturnValue(otp as never);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("LandingPage — Step 3", () => {
  it("OTP: filling all digits and submitting calls useSubmitAdditionalInfo with the OTP accountField", async () => {
    const user = userEvent.setup();
    await seedView(user, mockKeyNeedsOtp);

    await user.type(await screen.findByLabelText(OTP_LABEL), "123456");
    await user.click(screen.getByText("public.landing.otp.submit"));

    expect(otpMutate).toHaveBeenCalledWith(
      {
        activationId: mockKeyNeedsOtp.activationId,
        command: { accountFields: [{ field: AccountInformation.OTP, value: "123456" }] },
      },
      expect.anything(),
    );
  });

  it("OTP: a network failure preserves the entered code and doesn't count as a wrong attempt", async () => {
    const user = userEvent.setup();
    otpMutate.mockImplementation((_vars: unknown, opts?: { onError?: (e: unknown) => void }) =>
      opts?.onError?.(Object.assign(new Error("down"), { isAxiosError: true })),
    );
    await seedView(user, mockKeyNeedsOtp);

    const otpInput = await screen.findByLabelText(OTP_LABEL);
    await user.type(otpInput, "123456");
    await user.click(screen.getByText("public.landing.otp.submit"));

    expect(await screen.findByText("public.landing.otp.networkError")).toBeInTheDocument();
    expect(otpInput).toHaveValue("123456");
    expect(screen.queryByText("public.landing.otp.attemptsRemaining")).not.toBeInTheDocument();
  });

  it("OTP: 5 wrong attempts locks out the input, resend, and submit button", async () => {
    const user = userEvent.setup();
    otpMutate.mockImplementation((_vars: unknown, opts?: { onError?: (e: unknown) => void }) =>
      opts?.onError?.(
        Object.assign(new Error("wrong"), { isAxiosError: true, response: { status: 400 } }),
      ),
    );
    await seedView(user, mockKeyNeedsOtp);
    const otpInput = await screen.findByLabelText(OTP_LABEL);

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await user.type(otpInput, "111111");
      await user.click(screen.getByText("public.landing.otp.submit"));
      if (attempt < 5) {
        expect(await screen.findByText("public.landing.otp.wrongCode")).toBeInTheDocument();
        expect(screen.getByText("public.landing.otp.attemptsRemaining")).toBeInTheDocument();
      }
    }

    expect(await screen.findByText("public.landing.otp.lockout")).toBeInTheDocument();
    expect(otpInput).toBeDisabled();
    expect(screen.getByText("public.landing.otp.submit").closest("button")).toBeDisabled();
  });

  it("OTP: Resend Code stays disabled during the cooldown, then becomes available", async () => {
    // Mounts OtpStep directly rather than through the full LandingPage tree: the cooldown
    // timer is entirely this component's own concern, and advancing fake timers through the
    // full page (StatsRow's IntersectionObserver-driven counter, etc.) is unrelated overhead
    // that fights the fake clock for no benefit here.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    render(<OtpStep activationId={mockKeyNeedsOtp.activationId} onSuccess={vi.fn()} />);

    expect(screen.getByText("public.landing.otp.resendIn")).toBeInTheDocument();
    expect(screen.queryByText("public.landing.otp.resend")).not.toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(60_000);

    expect(screen.getByText("public.landing.otp.resend")).toBeInTheDocument();
    expect(screen.getByText("public.landing.otp.resend").closest("button")).toBeEnabled();
  });

  it("Under-review: read-only amber notice with a WhatsApp link, no interactive form fields", async () => {
    const user = userEvent.setup();
    await seedView(user, mockKeyUnderReview);

    expect(await screen.findByText("public.landing.review.title")).toBeInTheDocument();
    expect(screen.getByText("common.actions.contactWhatsapp").closest("a")).toHaveAttribute(
      "target",
      "_blank",
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("Activated: shows the account badge and the security reminder", async () => {
    const user = userEvent.setup();
    await seedView(user, mockKeyActivated);

    expect(await screen.findByText("public.landing.completed.title")).toBeInTheDocument();
    expect(screen.getByText("public.landing.completed.account")).toBeInTheDocument();
    expect(screen.getByText("public.landing.completed.securityNotice")).toBeInTheDocument();
  });

  it("Failed: shows the failure card with a WhatsApp support link", async () => {
    const user = userEvent.setup();
    await seedView(user, mockKeyFailed);

    expect(await screen.findByText("public.landing.failed.title")).toBeInTheDocument();
    expect(screen.getByText("common.actions.contactWhatsapp").closest("a")).toHaveAttribute(
      "target",
      "_blank",
    );
  });
});
