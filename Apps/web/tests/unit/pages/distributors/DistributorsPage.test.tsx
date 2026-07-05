import "../../../fixtures/wrappers/mockTranslation";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import DistributorsPage from "@/pages/admin/distributors/DistributorsPage";
import * as useStatisticsHook from "@/hooks/useStatistics";
import * as useDistributorsHook from "@/hooks/useDistributors";
import * as useGeographyHook from "@/hooks/useGeography";

vi.mock("@/hooks/useStatistics");
vi.mock("@/hooks/useDistributors");
vi.mock("@/hooks/useGeography");

const WILAYAS = [{ id: "w1", wilayaCode: "16", frName: "Alger", arName: "" }];
const COMMUNES = [
  { id: "c1", communeCode: "1601", wilayaId: "w1", frName: "Bab Ezzouar", arName: "" },
];

function mockDistributors(items: unknown[]) {
  vi.mocked(useDistributorsHook.useDistributors).mockReturnValue({
    data: { items, meta: { page: 1, limit: 10, total: items.length, totalPages: 1 } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never);
}

describe("DistributorsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useStatisticsHook.useDistributorsSummary).mockReturnValue({
      data: {
        totalDistributors: 8,
        activeWithStock: 5,
        totalCardsInStock: 60,
        activationsThisMonth: 22,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useDistributorsHook.useToggleDistributor).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useDistributorsHook.useDeleteDistributor).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useGeographyHook.useWilayas).mockReturnValue({
      data: WILAYAS,
      isLoading: false,
      isError: false,
    } as never);
    // Both the filter's and the create-modal's useCommunes(id) share this mock — only
    // return communes once a wilaya id is actually passed in, matching enabled: !!wilayaId.
    vi.mocked(useGeographyHook.useCommunes).mockImplementation(
      (wilayaId?: string) =>
        ({
          data: wilayaId ? COMMUNES : undefined,
          isLoading: false,
          isError: false,
        }) as never,
    );
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <DistributorsPage />
      </MemoryRouter>,
    );
  }

  it("shows no-match+Clear Filters once a search term is typed, and Clear resets it", async () => {
    const user = userEvent.setup();
    mockDistributors([]);
    vi.mocked(useDistributorsHook.useCreateDistributor).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    renderPage();

    await user.type(screen.getByPlaceholderText("admin.distributors.search.placeholder"), "zzz");
    expect(await screen.findByText("admin.distributors.empty.noMatch")).toBeInTheDocument();

    await user.click(screen.getByText("common.actions.clear"));
    expect(await screen.findByText("admin.distributors.empty.noDistributors")).toBeInTheDocument();
  });

  it("keeps the commune select disabled until a wilaya is chosen in the create modal, then loads communes for it", async () => {
    const user = userEvent.setup();
    mockDistributors([]);
    vi.mocked(useDistributorsHook.useCreateDistributor).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    renderPage();

    await user.click(screen.getByText("admin.distributors.create.title"));
    const dialog = await screen.findByRole("dialog");

    const communeTrigger = within(dialog).getAllByRole("combobox")[1];
    expect(communeTrigger).toBeDisabled();

    const wilayaTrigger = within(dialog).getAllByRole("combobox")[0];
    await user.click(wilayaTrigger);
    await user.click(await screen.findByRole("option", { name: "Alger" }));

    // Re-render passes the chosen wilaya id into useCommunes — the mocked implementation
    // only returns data once an id is actually supplied (enabled: !!wilayaId gating).
    expect(useGeographyHook.useCommunes).toHaveBeenCalledWith("w1");
    expect(within(dialog).getAllByRole("combobox")[1]).not.toBeDisabled();
  });

  it("does not submit the create-distributor form when required fields are empty", async () => {
    const user = userEvent.setup();
    mockDistributors([]);
    const createMutate = vi.fn();
    vi.mocked(useDistributorsHook.useCreateDistributor).mockReturnValue({
      mutate: createMutate,
      isPending: false,
    } as never);
    renderPage();

    await user.click(screen.getByText("admin.distributors.create.title"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByText("common.actions.add"));

    expect(createMutate).not.toHaveBeenCalled();
  });
});
