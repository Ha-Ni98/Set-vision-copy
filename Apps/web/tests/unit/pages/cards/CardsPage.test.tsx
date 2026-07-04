import "../../../fixtures/wrappers/mockTranslation";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { CardStat } from "@my-app/contract";
import CardsPage from "@/pages/admin/activations/CardsPage";
import * as useStatisticsHook from "@/hooks/useStatistics";
import * as useSubscriptionPlansHook from "@/hooks/useSubscriptionPlans";
import * as useDistributorsHook from "@/hooks/useDistributors";
import * as useCardsHook from "@/hooks/useCards";

vi.mock("@/hooks/useStatistics");
vi.mock("@/hooks/useSubscriptionPlans");
vi.mock("@/hooks/useDistributors");
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
const DISTRIBUTORS = [
  {
    id: "dist1",
    fullName: "Distrib One",
    storeName: "Store One",
    phone: "0555000000",
    wilayaId: "w1",
    communeId: "c1",
    wilayaName: "Alger",
    communeName: "Bab Ezzouar",
    isEnabled: true,
    nbOfActiveCards: 5,
    nbOfActivation: 2,
    deliveredOrdersCount: 1,
    createdAt: new Date().toISOString(),
  },
];

function card(overrides: Record<string, unknown> = {}) {
  return {
    id: "card-1",
    key: "KEY-1",
    subscriptionPlanId: "plan1",
    subscriptionLabel: "Snap+ 1mo",
    setNumber: "SET-1",
    lotNumber: null,
    distributorName: null,
    cardStat: CardStat.IN_SET,
    isActive: false,
    isDisabled: false,
    isRevoked: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function mockCards(items: unknown[]) {
  vi.mocked(useCardsHook.useCards).mockReturnValue({
    data: { items, meta: { page: 1, limit: 10, total: items.length, totalPages: 1 } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never);
}

describe("CardsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useStatisticsHook.useInventorySummary).mockReturnValue({
      data: {
        sets: [],
        lots: [],
        cards: [
          { stat: CardStat.AT_DISTRIBUTOR, count: 7 },
          { stat: CardStat.IN_SET, count: 3 },
        ],
        cardFlags: { disabled: 2, revoked: 3 },
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
    vi.mocked(useDistributorsHook.useDistributors).mockReturnValue({
      data: { items: DISTRIBUTORS, meta: { page: 1, limit: 100, total: 1, totalPages: 1 } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useCardsHook.useCard).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useCardsHook.useDeleteCard).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useCardsHook.useDisableCard).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useCardsHook.useEnableCard).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useCardsHook.useRevokeCard).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    mockCards([]);
  });

  function renderPage(initialRoute = "/admin/activations/cards") {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <CardsPage />
      </MemoryRouter>,
    );
  }

  it("renders stats — Flagged sums disabled+revoked, missing cardStat entries read as 0", () => {
    renderPage();
    expect(screen.getByText("10")).toBeInTheDocument(); // Total Cards (Σ cards[].count) = 7 + 3
    expect(screen.getByText("7")).toBeInTheDocument(); // Active (AT_DISTRIBUTOR)
    expect(screen.getByText("5")).toBeInTheDocument(); // Flagged = 2 + 3
  });

  it("shows the no-cards empty state, then no-match once a search term is typed", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByText("admin.cards.empty.noCards")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("admin.cards.search.placeholder"), "zzz");
    expect(await screen.findByText("admin.cards.empty.noMatch")).toBeInTheDocument();
  });

  it("seeds ?set= into the query once and renders a clearable chip", async () => {
    const user = userEvent.setup();
    renderPage("/admin/activations/cards?set=SET-9");

    expect(useCardsHook.useCards).toHaveBeenCalledWith(
      expect.objectContaining({ setNumber: "SET-9" }),
    );
    const chip = screen.getByText("admin.cards.table.set: SET-9", { exact: false });
    expect(chip).toBeInTheDocument();

    await user.click(chip);
    expect(
      screen.queryByText("admin.cards.table.set: SET-9", { exact: false }),
    ).not.toBeInTheDocument();
  });

  it("gates Revoke to ACTIVATION_FAILED+not-disabled, and confirms with the correct id", async () => {
    const user = userEvent.setup();
    const revokeMutate = vi.fn();
    vi.mocked(useCardsHook.useRevokeCard).mockReturnValue({
      mutate: revokeMutate,
      isPending: false,
    } as never);
    mockCards([
      card({ id: "card-failed", cardStat: CardStat.ACTIVATION_FAILED, isDisabled: false }),
    ]);
    renderPage();

    await user.click(screen.getByLabelText("common.actions.action"));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("common.actions.revoke")).toBeInTheDocument();
    await user.click(within(menu).getByText("common.actions.revoke"));

    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByText("common.actions.confirm"));
    expect(revokeMutate).toHaveBeenCalledWith("card-failed");
  });

  it("does not offer Revoke on a disabled ACTIVATION_FAILED card, but does offer Enable", async () => {
    const user = userEvent.setup();
    mockCards([
      card({ id: "card-disabled", cardStat: CardStat.ACTIVATION_FAILED, isDisabled: true }),
    ]);
    renderPage();

    await user.click(screen.getByLabelText("common.actions.action"));
    const menu = await screen.findByRole("menu");
    expect(within(menu).queryByText("common.actions.revoke")).not.toBeInTheDocument();
    expect(within(menu).getByText("common.actions.enable")).toBeInTheDocument();
  });

  it("renders flag chips for disabled/revoked cards", () => {
    mockCards([
      card({ id: "card-disabled", isDisabled: true }),
      card({ id: "card-revoked", isRevoked: true }),
    ]);
    renderPage();

    // StatusPill prefixes the label with a bullet glyph in the same text node.
    expect(screen.getByText("enums.cardFlag.disabled", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("enums.cardFlag.revoked", { exact: false })).toBeInTheDocument();
  });

  it("detail modal only lists timeline rows whose timestamp exists", async () => {
    const user = userEvent.setup();
    mockCards([card({ id: "card-1" })]);
    vi.mocked(useCardsHook.useCard).mockReturnValue({
      data: {
        ...card({ id: "card-1" }),
        distributionTimeline: [{ stat: CardStat.IN_SET, at: new Date().toISOString() }],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderPage();

    await user.click(screen.getByLabelText("common.actions.action"));
    const menu = await screen.findByRole("menu");
    await user.click(within(menu).getByText("common.actions.view"));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getAllByText("enums.cardStat.IN_SET").length).toBe(1);
  });
});
