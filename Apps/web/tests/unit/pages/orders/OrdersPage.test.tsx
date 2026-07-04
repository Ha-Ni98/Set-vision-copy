import "../../../fixtures/wrappers/mockTranslation";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { OrderStat, DeliveryType } from "@my-app/contract";
import OrdersPage from "@/pages/admin/distributors/OrdersPage";
import * as useStatisticsHook from "@/hooks/useStatistics";
import * as useOrdersHook from "@/hooks/useOrders";
import * as useGeographyHook from "@/hooks/useGeography";
import * as useDeliveryCompaniesHook from "@/hooks/useDeliveryCompanies";
import * as useDistributorsHook from "@/hooks/useDistributors";
import * as useSubscriptionPlansHook from "@/hooks/useSubscriptionPlans";
import * as useLotsHook from "@/hooks/useLots";

vi.mock("@/hooks/useStatistics");
vi.mock("@/hooks/useOrders");
vi.mock("@/hooks/useGeography");
vi.mock("@/hooks/useDeliveryCompanies");
vi.mock("@/hooks/useDistributors");
vi.mock("@/hooks/useSubscriptionPlans");
vi.mock("@/hooks/useLots");

const WILAYAS = [{ id: "w1", wilayaCode: "16", frName: "Alger", arName: "" }];
const COMMUNES = [
  { id: "c1", communeCode: "1601", wilayaId: "w1", frName: "Bab Ezzouar", arName: "" },
];
const DELIVERY_COMPANIES = [
  { id: "dc1", name: "Yalidine", registeredName: "Yalidine SARL", isActive: true },
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
const PLANS = [
  {
    id: "plan1",
    subscriptionType: "TYPE",
    subscriptionDuration: "DURATION",
    label: "Snap+ 1mo",
    isActive: true,
  },
];
const LOTS = [
  {
    id: "lot1",
    lotNumber: "LOT-1",
    subscriptionPlanId: "plan1",
    subscriptionLabel: "Snap+ 1mo",
    lotStat: "PENDING",
    nbOfCards: 50,
    deliveredCardsCount: 0,
    isReturned: false,
    createdAt: new Date().toISOString(),
    deliveryDate: null,
  },
];

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    orderNumber: "ORD-1",
    distributorId: "dist1",
    distributorName: "Distrib One",
    receivedName: "John Doe",
    receivedPhone: "0555111111",
    wilayaId: "w1",
    wilayaName: "Alger",
    communeId: "c1",
    communeName: "Bab Ezzouar",
    deliveryCompanyId: "dc1",
    deliveryCompanyName: "Yalidine",
    deliveryType: DeliveryType.HOME,
    lotNumbers: ["LOT-1"],
    cardsCount: 50,
    orderPrice: 5000,
    deliverPrice: 500,
    cardsDeliveredCount: 0,
    orderStat: OrderStat.PENDING_DELIVERY,
    createdAt: new Date().toISOString(),
    completedAt: null,
    ...overrides,
  };
}

function mockOrders(items: unknown[]) {
  vi.mocked(useOrdersHook.useOrders).mockReturnValue({
    data: { items, meta: { page: 1, limit: 10, total: items.length, totalPages: 1 } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never);
}

describe("OrdersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useStatisticsHook.useOrdersSummary).mockReturnValue({
      data: {
        totalOrders: { all: 0, month: 0, week: 0 },
        byState: [],
        pendingDelivery: 0,
        inDelivery: 0,
        totalRevenue: 0,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useGeographyHook.useWilayas).mockReturnValue({
      data: WILAYAS,
      isLoading: false,
      isError: false,
    } as never);
    vi.mocked(useGeographyHook.useCommunes).mockImplementation(
      (wilayaId?: string) =>
        ({ data: wilayaId ? COMMUNES : undefined, isLoading: false, isError: false }) as never,
    );
    vi.mocked(useDeliveryCompaniesHook.useDeliveryCompanies).mockReturnValue({
      data: DELIVERY_COMPANIES,
      isLoading: false,
      isError: false,
    } as never);
    vi.mocked(useDistributorsHook.useDistributors).mockReturnValue({
      data: { items: DISTRIBUTORS, meta: { page: 1, limit: 100, total: 1, totalPages: 1 } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useSubscriptionPlansHook.useSubscriptionPlans).mockReturnValue({
      data: PLANS,
      isLoading: false,
      isError: false,
    } as never);
    vi.mocked(useLotsHook.useAvailableLotsForOrder).mockReturnValue({
      data: LOTS,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useOrdersHook.useOrder).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useOrdersHook.useCreateOrder).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useOrdersHook.useTransitionOrder).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useOrdersHook.useDeleteOrder).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>,
    );
  }

  it("renders 4 stat-card skeletons while the summary is loading", () => {
    vi.mocked(useStatisticsHook.useOrdersSummary).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as never);
    mockOrders([]);
    const { container } = renderPage();
    expect(container.querySelectorAll(".rounded-2xl.border.p-5")).toHaveLength(4);
  });

  it("shows the no-orders empty state, then no-match+Clear once a search term is typed", async () => {
    const user = userEvent.setup();
    mockOrders([]);
    renderPage();
    expect(screen.getByText("admin.orders.empty.noOrders")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("admin.orders.search.placeholder"), "zzz");
    expect(await screen.findByText("admin.orders.empty.noMatch")).toBeInTheDocument();

    await user.click(screen.getByText("common.actions.clear"));
    expect(await screen.findByText("admin.orders.empty.noOrders")).toBeInTheDocument();
  });

  it("shows NotFoundState with a working retry on error", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    vi.mocked(useOrdersHook.useOrders).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    } as never);
    renderPage();
    await user.click(screen.getByText("common.actions.tryAgain"));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("gates Delete/Mark actions by orderStat", async () => {
    const user = userEvent.setup();
    mockOrders([
      order({ id: "o-pending", orderStat: OrderStat.PENDING_DELIVERY }),
      order({ id: "o-delivery", orderStat: OrderStat.IN_DELIVERY }),
    ]);
    renderPage();

    const triggers = screen.getAllByLabelText("common.actions.action");
    await user.click(triggers[0]);
    let menu = await screen.findByRole("menu");
    expect(within(menu).getByText("common.actions.markInDelivery")).toBeInTheDocument();
    expect(within(menu).getByText("common.actions.delete")).toBeInTheDocument();
    expect(within(menu).queryByText("common.actions.markDelivered")).not.toBeInTheDocument();
    await user.keyboard("{Escape}");

    await user.click(triggers[1]);
    menu = await screen.findByRole("menu");
    expect(within(menu).getByText("common.actions.markDelivered")).toBeInTheDocument();
    expect(within(menu).getByText("common.actions.markReturned")).toBeInTheDocument();
    expect(within(menu).queryByText("common.actions.delete")).not.toBeInTheDocument();
  });

  it("defaults MarkDeliveredModal's count to cardsCount and confirms with the real value", async () => {
    const user = userEvent.setup();
    const transitionMutate = vi.fn();
    vi.mocked(useOrdersHook.useTransitionOrder).mockReturnValue({
      mutate: transitionMutate,
      isPending: false,
    } as never);
    mockOrders([order({ id: "o-1", orderStat: OrderStat.IN_DELIVERY, cardsCount: 42 })]);
    renderPage();

    await user.click(screen.getByLabelText("common.actions.action"));
    const menu = await screen.findByRole("menu");
    await user.click(within(menu).getByText("common.actions.markDelivered"));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("admin.orders.markDelivered.deliveredCount")).toHaveValue(
      42,
    );
    await user.click(within(dialog).getByText("common.actions.confirm"));

    expect(transitionMutate).toHaveBeenCalledWith({
      id: "o-1",
      command: { to: OrderStat.DELIVERED, deliveredCount: 42 },
    });
  });

  it("blocks the wizard's Next on Step 1 until a distributor is selected", async () => {
    const user = userEvent.setup();
    mockOrders([]);
    renderPage();

    await user.click(screen.getByText("admin.orders.create.title"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByText("common.actions.next"));

    // Still on Step 1 — the distributor list is still showing.
    expect(within(dialog).getByText("Distrib One")).toBeInTheDocument();
  });

  it("shows a Link to Sets & Lots when Step 2 has no eligible lots", async () => {
    const user = userEvent.setup();
    vi.mocked(useLotsHook.useAvailableLotsForOrder).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    mockOrders([]);
    renderPage();

    await user.click(screen.getByText("admin.orders.create.title"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByText("Distrib One"));
    await user.click(within(dialog).getByText("common.actions.next"));

    expect(within(dialog).getByText("admin.orders.create.noEligibleLots")).toBeInTheDocument();
    const link = within(dialog).getByText("admin.shell.nav.setsAndLots").closest("a");
    expect(link).toHaveAttribute("href", "/admin/activations/sets-lots");
  });

  it("submits a fully completed wizard and calls useCreateOrder.mutate with the built command", async () => {
    const user = userEvent.setup();
    const createMutate = vi.fn();
    vi.mocked(useOrdersHook.useCreateOrder).mockReturnValue({
      mutate: createMutate,
      isPending: false,
    } as never);
    mockOrders([]);
    renderPage();

    await user.click(screen.getByText("admin.orders.create.title"));
    const dialog = await screen.findByRole("dialog");

    // Step 1 — select distributor (prefills receiver info for Step 3).
    await user.click(within(dialog).getByText("Distrib One"));
    await user.click(within(dialog).getByText("common.actions.next"));

    // Step 2 — select a lot.
    await user.click(within(dialog).getByText("LOT-1"));
    await user.click(within(dialog).getByText("common.actions.next"));

    // Step 3 — already prefilled from the chosen distributor.
    await user.click(within(dialog).getByText("common.actions.next"));

    // Step 4 — delivery company + a positive order price.
    const deliveryCompanyTrigger = within(dialog).getAllByRole("combobox")[0];
    await user.click(deliveryCompanyTrigger);
    await user.click(await screen.findByRole("option", { name: "Yalidine" }));
    const orderPriceInput = within(dialog).getByLabelText("admin.orders.create.orderPrice");
    await user.clear(orderPriceInput);
    await user.type(orderPriceInput, "5000");
    await user.click(within(dialog).getByText("common.actions.next"));

    // Step 5 — confirm.
    await user.click(within(dialog).getByText("common.actions.confirm"));

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        distributorId: "dist1",
        lotIds: ["lot1"],
        deliveryCompanyId: "dc1",
        orderPrice: 5000,
      }),
      expect.anything(),
    );
  });
});
