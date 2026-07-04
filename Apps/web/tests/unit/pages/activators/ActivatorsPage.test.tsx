import "../../../fixtures/wrappers/mockTranslation";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ActivatorsPage from "@/pages/admin/activators/ActivatorsPage";
import * as useStatisticsHook from "@/hooks/useStatistics";
import * as useActivatorsHook from "@/hooks/useActivators";
import * as usePaymentsHook from "@/hooks/usePayments";

vi.mock("@/hooks/useStatistics");
vi.mock("@/hooks/useActivators");
vi.mock("@/hooks/usePayments");

const summaryLoaded = {
  data: { totalActivators: 12, onlineNow: 3, totalSuccessful: 200, totalCreditsOwed: 500 },
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

function mockActivators(items: unknown[]) {
  vi.mocked(useActivatorsHook.useActivators).mockReturnValue({
    data: { items, meta: { page: 1, limit: 10, total: items.length, totalPages: 1 } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never);
}

describe("ActivatorsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useStatisticsHook.useActivatorsSummary).mockReturnValue(summaryLoaded as never);
    vi.mocked(usePaymentsHook.useRecordPayment).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useActivatorsHook.useToggleActivator).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useActivatorsHook.useDeleteActivator).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <ActivatorsPage />
      </MemoryRouter>,
    );
  }

  it("shows the no-activators empty state with no search active", () => {
    mockActivators([]);
    vi.mocked(useActivatorsHook.useCreateActivator).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    renderPage();
    expect(screen.getByText("admin.activators.empty.noActivators")).toBeInTheDocument();
  });

  it("shows the no-match empty state once a search term is typed", async () => {
    const user = userEvent.setup();
    mockActivators([]);
    vi.mocked(useActivatorsHook.useCreateActivator).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    renderPage();

    await user.type(screen.getByPlaceholderText("admin.activators.search.placeholder"), "zzz");
    expect(await screen.findByText("admin.activators.empty.noMatch")).toBeInTheDocument();
  });

  it("shows Zod validation errors on an empty Create Activator submit", async () => {
    const user = userEvent.setup();
    mockActivators([]);
    const createMutate = vi.fn();
    vi.mocked(useActivatorsHook.useCreateActivator).mockReturnValue({
      mutate: createMutate,
      isPending: false,
    } as never);
    renderPage();

    await user.click(screen.getByText("admin.activators.create.title"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByText("common.actions.add"));

    // fullName and username both render "common.validation.minLength" (identical text) —
    // assert on phone's distinct message instead of an ambiguous getByText match.
    expect(await screen.findByText("common.validation.invalidPhone")).toBeInTheDocument();
    expect((await screen.findAllByText("common.validation.minLength")).length).toBe(2);
    expect(createMutate).not.toHaveBeenCalled();
  });

  it("submits valid Create Activator values and reveals the generated password on success", async () => {
    const user = userEvent.setup();
    mockActivators([]);
    const createMutate = vi.fn((_values, opts?: { onSuccess?: (d: unknown) => void }) => {
      opts?.onSuccess?.({ generatedPassword: "OneTime123!" });
    });
    vi.mocked(useActivatorsHook.useCreateActivator).mockReturnValue({
      mutate: createMutate,
      isPending: false,
    } as never);
    renderPage();

    await user.click(screen.getByText("admin.activators.create.title"));
    const dialog = await screen.findByRole("dialog");
    await user.type(screen.getByLabelText("admin.activators.create.fullName"), "Ali Benali");
    await user.type(screen.getByLabelText("admin.activators.create.username"), "ali_b");
    await user.type(screen.getByLabelText("admin.activators.create.phone"), "0555123456");
    await user.click(within(dialog).getByText("common.actions.add"));

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: "Ali Benali", username: "ali_b", phone: "0555123456" }),
      expect.anything(),
    );
    expect(await screen.findByText("OneTime123!")).toBeInTheDocument();
  });
});
