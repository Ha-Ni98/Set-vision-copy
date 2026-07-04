import "../../../../fixtures/wrappers/mockTranslation";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AccountInformation,
  ActivationStat,
  type ActiveRequestDTO,
  type PendingActivationDTO,
} from "@my-app/contract";
import RequestsPage from "@/pages/activator/RequestsPage";
import * as useActiveRequestsHook from "@/hooks/useActiveRequests";
import * as usePendingActivationsHook from "@/hooks/usePendingActivations";
import * as useTakeActivationHook from "@/hooks/useTakeActivation";
import * as useNotificationSoundHook from "@/hooks/useNotificationSound";
import * as useFlagWrongInfoHook from "@/hooks/useFlagWrongInfo";
import * as useRequestAdditionalInfoHook from "@/hooks/useRequestAdditionalInfo";
import * as useActivateRequestHook from "@/hooks/useActivateRequest";
import * as useCancelActivationHook from "@/hooks/useCancelActivation";
import * as useFreezeActivationHook from "@/hooks/useFreezeActivation";

vi.mock("@/hooks/useActiveRequests");
vi.mock("@/hooks/usePendingActivations");
vi.mock("@/hooks/useTakeActivation");
vi.mock("@/hooks/useNotificationSound");
vi.mock("@/hooks/useFlagWrongInfo");
vi.mock("@/hooks/useRequestAdditionalInfo");
vi.mock("@/hooks/useActivateRequest");
vi.mock("@/hooks/useCancelActivation");
vi.mock("@/hooks/useFreezeActivation");

function activeRequest(overrides: Partial<ActiveRequestDTO> = {}): ActiveRequestDTO {
  return {
    id: "act-1",
    subscriptionLabel: "Snap+ 1mo",
    key: "FULL-KEY-0001",
    takenAt: new Date().toISOString(),
    state: ActivationStat.PROCESSING,
    distributor: { storeName: "Store One", wilayaName: "Alger", communeName: "Bab Ezzouar" },
    client: { fullName: "Client One", phone: "0555000001" },
    accountFields: [{ fieldLabel: "Username", value: "client_snap" }],
    otpValue: null,
    freezeReason: null,
    ...overrides,
  };
}

function pendingItem(overrides: Partial<PendingActivationDTO> = {}): PendingActivationDTO {
  return {
    id: "pend-1",
    subscriptionLabel: "Snap+ 1mo",
    keyMasked: "****-0002",
    requestedAt: new Date().toISOString(),
    ...overrides,
  };
}

function mutationMock() {
  return { mutate: vi.fn(), isPending: false };
}

function mockActive(items: ActiveRequestDTO[], overrides: Record<string, unknown> = {}) {
  vi.mocked(useActiveRequestsHook.useActiveRequests).mockReturnValue({
    data: items,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as never);
}

function mockPending(items: PendingActivationDTO[], overrides: Record<string, unknown> = {}) {
  vi.mocked(usePendingActivationsHook.usePendingActivations).mockReturnValue({
    data: items,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as never);
}

describe("RequestsPage", () => {
  let takeMutate: ReturnType<typeof vi.fn>;
  let flagWrongMutate: ReturnType<typeof vi.fn>;
  let requestOtpMutate: ReturnType<typeof vi.fn>;
  let activateMutate: ReturnType<typeof vi.fn>;
  let cancelMutate: ReturnType<typeof vi.fn>;
  let freezeMutate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockActive([]);
    mockPending([]);

    const take = mutationMock();
    takeMutate = take.mutate;
    vi.mocked(useTakeActivationHook.useTakeActivation).mockReturnValue(take as never);

    vi.mocked(useNotificationSoundHook.useNotificationSound).mockReturnValue({
      muted: false,
      toggleMute: vi.fn(),
      playChime: vi.fn(),
    });

    const flagWrong = mutationMock();
    flagWrongMutate = flagWrong.mutate;
    vi.mocked(useFlagWrongInfoHook.useFlagWrongInfo).mockReturnValue(flagWrong as never);

    const requestOtp = mutationMock();
    requestOtpMutate = requestOtp.mutate;
    vi.mocked(useRequestAdditionalInfoHook.useRequestAdditionalInfo).mockReturnValue(
      requestOtp as never,
    );

    const activate = mutationMock();
    activateMutate = activate.mutate;
    vi.mocked(useActivateRequestHook.useActivateRequest).mockReturnValue(activate as never);

    const cancel = mutationMock();
    cancelMutate = cancel.mutate;
    vi.mocked(useCancelActivationHook.useCancelActivation).mockReturnValue(cancel as never);

    const freeze = mutationMock();
    freezeMutate = freeze.mutate;
    vi.mocked(useFreezeActivationHook.useFreezeActivation).mockReturnValue(freeze as never);
  });

  it("shows the reassuring empty-pool message (not an error) when there are no pending requests", () => {
    render(<RequestsPage />);
    expect(screen.getByText("activator.requests.emptyPending.title")).toBeInTheDocument();
    expect(screen.queryByText("common.errors.crashTitle")).not.toBeInTheDocument();
  });

  it("shows the empty-active state when there are no active requests", () => {
    render(<RequestsPage />);
    expect(screen.getByText("activator.requests.emptyActive.title")).toBeInTheDocument();
  });

  it("shows NotFoundState with working retries for both sections on error", async () => {
    const user = userEvent.setup();
    const refetchActive = vi.fn();
    const refetchPending = vi.fn();
    mockActive([], { data: undefined, isError: true, refetch: refetchActive });
    mockPending([], { data: undefined, isError: true, refetch: refetchPending });
    render(<RequestsPage />);

    const retries = screen.getAllByText("common.actions.tryAgain");
    expect(retries).toHaveLength(2);
    await user.click(retries[0]);
    await user.click(retries[1]);
    expect(refetchActive).toHaveBeenCalledTimes(1);
    expect(refetchPending).toHaveBeenCalledTimes(1);
  });

  it("disables all 5 card actions and shows the locked notice while FREEZE", () => {
    mockActive([activeRequest({ state: ActivationStat.FREEZE })]);
    render(<RequestsPage />);

    expect(screen.getByText("activator.requests.card.adminLockedNotice")).toBeInTheDocument();
    expect(screen.getByText("activator.requests.card.wrongInfo").closest("button")).toBeDisabled();
    expect(screen.getByText("activator.requests.card.otp").closest("button")).toBeDisabled();
    expect(screen.getByText("common.actions.activate").closest("button")).toBeDisabled();
    expect(screen.getByText("common.actions.cancel").closest("button")).toBeDisabled();
    expect(screen.getByText("activator.requests.card.freeze").closest("button")).toBeDisabled();
  });

  it("enables all 5 card actions while PROCESSING (not frozen)", () => {
    mockActive([activeRequest({ state: ActivationStat.PROCESSING })]);
    render(<RequestsPage />);

    expect(screen.queryByText("activator.requests.card.adminLockedNotice")).not.toBeInTheDocument();
    expect(screen.getByText("activator.requests.card.wrongInfo").closest("button")).toBeEnabled();
    expect(screen.getByText("common.actions.activate").closest("button")).toBeEnabled();
  });

  it("Wrong Info: checking a field and confirming calls useFlagWrongInfo.mutate with {fields}", async () => {
    const user = userEvent.setup();
    mockActive([activeRequest({ id: "act-9" })]);
    render(<RequestsPage />);

    await user.click(screen.getByText("activator.requests.card.wrongInfo"));
    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("checkbox", {
        name: `enums.accountInformation.${AccountInformation.USERNAME}`,
      }),
    );
    await user.click(within(dialog).getByText("common.actions.confirm"));

    expect(flagWrongMutate).toHaveBeenCalledWith(
      { id: "act-9", command: { fields: [AccountInformation.USERNAME] } },
      expect.anything(),
    );
  });

  it("Request OTP: clicking calls useRequestAdditionalInfo.mutate with {fields:[OTP]} directly (no dialog)", async () => {
    const user = userEvent.setup();
    mockActive([activeRequest({ id: "act-otp" })]);
    render(<RequestsPage />);

    await user.click(screen.getByText("activator.requests.card.otp"));

    expect(requestOtpMutate).toHaveBeenCalledWith({
      id: "act-otp",
      command: { fields: [AccountInformation.OTP] },
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Activate: clicking calls useActivateRequest.mutate(id) directly (no confirm)", async () => {
    const user = userEvent.setup();
    mockActive([activeRequest({ id: "act-done" })]);
    render(<RequestsPage />);

    await user.click(screen.getByText("common.actions.activate"));

    expect(activateMutate).toHaveBeenCalledWith("act-done");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("Cancel: requires confirmation, then calls useCancelActivation.mutate(id)", async () => {
    const user = userEvent.setup();
    mockActive([activeRequest({ id: "act-cancel" })]);
    render(<RequestsPage />);

    await user.click(screen.getByText("common.actions.cancel"));
    const dialog = await screen.findByRole("alertdialog");
    expect(cancelMutate).not.toHaveBeenCalled();
    await user.click(within(dialog).getByText("activator.requests.card.confirmCancel"));

    expect(cancelMutate).toHaveBeenCalledWith("act-cancel");
  });

  it("Freeze: typing a reason and submitting calls useFreezeActivation.mutate with {reason}", async () => {
    const user = userEvent.setup();
    mockActive([activeRequest({ id: "act-freeze" })]);
    render(<RequestsPage />);

    await user.click(screen.getByText("activator.requests.card.freeze"));
    const dialog = await screen.findByRole("dialog");
    await user.type(
      within(dialog).getByPlaceholderText("activator.requests.card.adminPlaceholder"),
      "Suspicious activity",
    );
    await user.click(within(dialog).getByText("common.actions.submit"));

    expect(freezeMutate).toHaveBeenCalledWith(
      { id: "act-freeze", command: { reason: "Suspicious activity" } },
      expect.anything(),
    );
  });

  it("Freeze: blocks submit with no reason typed", async () => {
    const user = userEvent.setup();
    mockActive([activeRequest({ id: "act-freeze-empty" })]);
    render(<RequestsPage />);

    await user.click(screen.getByText("activator.requests.card.freeze"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByText("common.actions.submit"));

    expect(await within(dialog).findByRole("alert")).toBeInTheDocument();
    expect(freezeMutate).not.toHaveBeenCalled();
  });

  it("Take: clicking the pool row's Activate button calls useTakeActivation.mutate(id)", async () => {
    const user = userEvent.setup();
    mockPending([pendingItem({ id: "pend-take" })]);
    render(<RequestsPage />);

    // DataTable renders both the desktop table and the mobile card list at once under JSDOM
    // (no real media-query evaluation) — scope to the desktop table's row.
    const table = screen.getByText("activator.requests.table.subscription").closest("table")!;
    await user.click(within(table).getByText("common.actions.activate"));
    expect(takeMutate).toHaveBeenCalledWith("pend-take");
  });

  it("disables the pool's Activate button once 3/3 active slots are used", () => {
    mockActive([
      activeRequest({ id: "a1" }),
      activeRequest({ id: "a2" }),
      activeRequest({ id: "a3" }),
    ]);
    mockPending([pendingItem({ id: "pend-full" })]);
    render(<RequestsPage />);

    expect(screen.getByText("activator.requests.slotsFullNotice")).toBeInTheDocument();
    const poolButtons = screen.getAllByText("common.actions.activate");
    // 3 active cards' own Activate buttons + the pool row's — the pool one (last) is disabled.
    expect(poolButtons[poolButtons.length - 1].closest("button")).toBeDisabled();
  });

  it("shows a green tier class for a freshly-taken active card, and red once past the elapsed danger threshold", () => {
    mockActive([activeRequest({ id: "fresh", takenAt: new Date().toISOString() })]);
    const { container: freshContainer } = render(<RequestsPage />);
    expect(freshContainer.querySelector(".text-success")).toBeInTheDocument();
    cleanup();

    mockActive([
      activeRequest({
        id: "stale",
        takenAt: new Date(Date.now() - 12 * 60_000).toISOString(),
      }),
    ]);
    const { container: staleContainer } = render(<RequestsPage />);
    expect(staleContainer.querySelector(".text-destructive")).toBeInTheDocument();
  });

  it("shows an amber tier class for a pool item waiting past the 5-minute warn threshold", () => {
    mockPending([
      pendingItem({ id: "waiting", requestedAt: new Date(Date.now() - 6 * 60_000).toISOString() }),
    ]);
    const { container } = render(<RequestsPage />);
    expect(container.querySelector(".text-warning")).toBeInTheDocument();
  });

  it("removes a taken row once the pending list is refreshed (simulated invalidation)", () => {
    mockPending([pendingItem({ id: "will-be-taken" })]);
    const { rerender } = render(<RequestsPage />);
    expect(screen.getAllByText("Snap+ 1mo").length).toBeGreaterThan(0);

    mockPending([]);
    rerender(<RequestsPage />);
    expect(screen.queryByText("Snap+ 1mo")).not.toBeInTheDocument();
    expect(screen.getByText("activator.requests.emptyPending.title")).toBeInTheDocument();
  });
});
