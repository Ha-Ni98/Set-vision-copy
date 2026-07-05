import "../../../fixtures/wrappers/mockTranslation";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SetStat, LotStat, CardStat } from "@my-app/contract";
import SetsLotsPage from "@/pages/admin/activations/SetsLotsPage";
import * as useStatisticsHook from "@/hooks/useStatistics";
import * as useSubscriptionPlansHook from "@/hooks/useSubscriptionPlans";
import * as useSetsHook from "@/hooks/useSets";
import * as useLotsHook from "@/hooks/useLots";
import * as useCardsHook from "@/hooks/useCards";

vi.mock("@/hooks/useStatistics");
vi.mock("@/hooks/useSubscriptionPlans");
vi.mock("@/hooks/useSets");
vi.mock("@/hooks/useLots");
vi.mock("@/hooks/useCards");

const PLANS = [
  {
    id: "plan1",
    subscriptionType: "TYPE",
    subscriptionDuration: "DURATION",
    label: "Snap+ 1mo",
    isActive: true,
  },
];
const CANDIDATE_CARDS = [
  { id: "card1", key: "KEY-1", subscriptionLabel: "Snap+ 1mo" },
  { id: "card2", key: "KEY-2", subscriptionLabel: "Snap+ 1mo" },
];

function set(overrides: Record<string, unknown> = {}) {
  return {
    id: "set-1",
    setNumber: "SET-1",
    subscriptionPlanId: "plan1",
    subscriptionLabel: "Snap+ 1mo",
    numberOfKeys: 100,
    setStat: SetStat.NOT_PRINTED,
    createdAt: new Date().toISOString(),
    printedAt: null,
    ...overrides,
  };
}

function lot(overrides: Record<string, unknown> = {}) {
  return {
    id: "lot-1",
    lotNumber: "LOT-1",
    subscriptionPlanId: "plan1",
    subscriptionLabel: "Snap+ 1mo",
    lotStat: LotStat.PENDING,
    nbOfCards: 50,
    deliveredCardsCount: 0,
    isReturned: false,
    createdAt: new Date().toISOString(),
    deliveryDate: null,
    ...overrides,
  };
}

function mockSets(items: unknown[]) {
  vi.mocked(useSetsHook.useSets).mockReturnValue({
    data: { items, meta: { page: 1, limit: 10, total: items.length, totalPages: 1 } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never);
}

function mockLots(items: unknown[]) {
  vi.mocked(useLotsHook.useLots).mockReturnValue({
    data: { items, meta: { page: 1, limit: 10, total: items.length, totalPages: 1 } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never);
}

describe("SetsLotsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useStatisticsHook.useInventorySummary).mockReturnValue({
      data: {
        sets: [{ stat: SetStat.NOT_PRINTED, count: 3 }],
        lots: [{ stat: LotStat.PENDING, count: 2 }],
        cards: [{ stat: CardStat.IN_SET, count: 10 }],
        cardFlags: { disabled: 0, revoked: 0 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useSubscriptionPlansHook.useSubscriptionPlans).mockReturnValue({
      data: PLANS,
      isLoading: false,
      isError: false,
    } as never);
    vi.mocked(useSetsHook.useCreateSet).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: undefined,
      reset: vi.fn(),
    } as never);
    vi.mocked(useSetsHook.useTransitionSet).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useSetsHook.useDeleteSet).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useLotsHook.useCreateLot).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useLotsHook.useDeleteLot).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useCardsHook.useAvailableCardsForLot).mockReturnValue({
      data: CANDIDATE_CARDS,
      isLoading: false,
      isError: false,
    } as never);
    mockSets([]);
    mockLots([]);
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <SetsLotsPage />
      </MemoryRouter>,
    );
  }

  it("renders stats treating a missing stat as 0 (no IN_LOT entry in the cards array)", () => {
    renderPage();
    // Total Sets = 3, Total Lots = 2, Cards in Sets (IN_SET) = 10, Cards in Lots (IN_LOT,
    // missing from the mocked array) = 0.
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("shows both tables' empty states, then no-match once each is searched", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByText("admin.setsLots.sets.empty.noSets")).toBeInTheDocument();
    expect(screen.getByText("admin.setsLots.lots.empty.noLots")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("admin.setsLots.sets.search.placeholder"), "zzz");
    expect(await screen.findByText("admin.setsLots.sets.empty.noMatch")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("admin.setsLots.lots.search.placeholder"), "zzz");
    expect(await screen.findByText("admin.setsLots.lots.empty.noMatch")).toBeInTheDocument();
  });

  it("shows Mark Printed only for a PENDING_PRINTING set, and confirms cascade Delete", async () => {
    const user = userEvent.setup();
    const deleteMutate = vi.fn();
    vi.mocked(useSetsHook.useDeleteSet).mockReturnValue({
      mutate: deleteMutate,
      isPending: false,
    } as never);
    mockSets([set({ id: "set-printing", setStat: SetStat.PENDING_PRINTING })]);
    renderPage();

    await user.click(screen.getByLabelText("common.actions.action"));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("common.actions.markPrinted")).toBeInTheDocument();
    expect(within(menu).queryByText("common.actions.sendToPrint")).not.toBeInTheDocument();

    await user.click(within(menu).getByText("common.actions.delete"));
    const dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByText("admin.setsLots.sets.actions.deleteConfirm.body"),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByText("common.actions.delete"));

    expect(deleteMutate).toHaveBeenCalledWith("set-printing");
  });

  it("only shows Delete for a PENDING lot, targets View Cards at ?lot=", async () => {
    const user = userEvent.setup();
    mockLots([lot({ id: "lot-pending", lotNumber: "LOT-9", lotStat: LotStat.PENDING })]);
    renderPage();

    const trigger = screen.getAllByLabelText("common.actions.action")[0];
    await user.click(trigger);
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("common.actions.delete")).toBeInTheDocument();
    const viewCardsLink = within(menu).getByText("common.actions.viewCards").closest("a");
    expect(viewCardsLink).toHaveAttribute("href", "/admin/activations/cards?lot=LOT-9");
  });

  it("does not show Delete for a DELIVERED lot", async () => {
    const user = userEvent.setup();
    mockLots([lot({ id: "lot-delivered", lotStat: LotStat.DELIVERED })]);
    renderPage();

    await user.click(screen.getByLabelText("common.actions.action"));
    const menu = await screen.findByRole("menu");
    expect(within(menu).queryByText("common.actions.delete")).not.toBeInTheDocument();
  });

  it("generates keys then submits, calling useCreateSet.mutate with the key list", async () => {
    const user = userEvent.setup();
    const createMutate = vi.fn();
    vi.mocked(useSetsHook.useCreateSet).mockReturnValue({
      mutate: createMutate,
      isPending: false,
      error: undefined,
      reset: vi.fn(),
    } as never);
    renderPage();

    await user.click(screen.getByText("admin.setsLots.sets.create.title"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Snap+ 1mo" }));

    const count = within(dialog).getByLabelText("admin.setsLots.sets.create.numberOfKeys");
    await user.clear(count);
    await user.type(count, "2");
    await user.click(within(dialog).getByText("admin.setsLots.sets.create.generate"));
    await user.click(within(dialog).getByText("common.actions.add"));

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionPlanId: "plan1",
        keys: expect.arrayContaining([expect.stringMatching(/^[0-9A-F]{12}$/)]),
      }),
      expect.anything(),
    );
    const [command] = createMutate.mock.calls[0] as [{ keys: string[] }];
    expect(command.keys).toHaveLength(2);
  });

  it("blocks Create Set submit until keys are generated", async () => {
    const user = userEvent.setup();
    const createMutate = vi.fn();
    vi.mocked(useSetsHook.useCreateSet).mockReturnValue({
      mutate: createMutate,
      isPending: false,
      error: undefined,
      reset: vi.fn(),
    } as never);
    renderPage();

    await user.click(screen.getByText("admin.setsLots.sets.create.title"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Snap+ 1mo" }));
    await user.click(within(dialog).getByText("common.actions.add"));

    expect(createMutate).not.toHaveBeenCalled();
    expect(within(dialog).getByText("admin.setsLots.sets.create.noKeys")).toBeInTheDocument();
  });

  it("Create Lot: Select All toggles cardIds, blocks empty submit, and confirms with the real selection", async () => {
    const user = userEvent.setup();
    const createLotMutate = vi.fn();
    vi.mocked(useLotsHook.useCreateLot).mockReturnValue({
      mutate: createLotMutate,
      isPending: false,
    } as never);
    renderPage();

    await user.click(screen.getByText("admin.setsLots.lots.create.title"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Snap+ 1mo" }));

    // Empty selection blocks submit — the Add button stays disabled.
    expect(within(dialog).getByText("common.actions.add").closest("button")).toBeDisabled();

    await user.click(within(dialog).getByText("common.actions.selectAll"));
    expect(within(dialog).getByText("common.actions.add").closest("button")).not.toBeDisabled();

    await user.click(within(dialog).getByText("common.actions.add"));
    expect(createLotMutate).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionPlanId: "plan1", cardIds: ["card1", "card2"] }),
      expect.anything(),
    );
  });
});
