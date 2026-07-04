import "../../../fixtures/wrappers/mockTranslation";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "@/pages/admin/settings/SettingsPage";
import * as useSessionHook from "@/hooks/useSession";
import * as useAdminsHook from "@/hooks/useAdmins";
import * as useSubscriptionPlansHook from "@/hooks/useSubscriptionPlans";
import * as useDeliveryCompaniesHook from "@/hooks/useDeliveryCompanies";

vi.mock("@/hooks/useSession");
vi.mock("@/hooks/useAdmins");
vi.mock("@/hooks/useSubscriptionPlans");
vi.mock("@/hooks/useDeliveryCompanies");

function admin(overrides: Record<string, unknown> = {}) {
  return {
    id: "admin-1",
    userId: "u-1",
    fullName: "Admin One",
    username: "admin1",
    phone: "0555000000",
    isEnabled: true,
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function mockAdmins(items: unknown[]) {
  vi.mocked(useAdminsHook.useAdmins).mockReturnValue({
    data: { items, meta: { page: 1, limit: 100, total: items.length, totalPages: 1 } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never);
}

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSessionHook.useSession).mockReturnValue({
      data: { id: "admin-1", username: "admin1", role: "ADMIN", fullName: "Admin One" },
      isLoading: false,
      isError: false,
    } as never);
    vi.mocked(useAdminsHook.useCreateAdmin).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useAdminsHook.useUpdateAdmin).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useAdminsHook.useToggleAdmin).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useAdminsHook.useResetAdminPassword).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useAdminsHook.useDeleteAdmin).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    mockAdmins([admin()]);
  });

  it("renders exactly 4 tabs", () => {
    render(<SettingsPage />);
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.getByText("admin.settings.tabs.adminAccounts")).toBeInTheDocument();
    expect(screen.getByText("admin.settings.tabs.commission")).toBeInTheDocument();
    expect(screen.getByText("admin.settings.tabs.subscriptionPlans")).toBeInTheDocument();
    expect(screen.getByText("admin.settings.tabs.deliveryCompanies")).toBeInTheDocument();
  });

  describe("Admin Accounts tab", () => {
    it("submits Add Admin and reveals the one-time generated password", async () => {
      const user = userEvent.setup();
      mockAdmins([]);
      const createMutate = vi.fn((_values, opts?: { onSuccess?: (d: unknown) => void }) => {
        opts?.onSuccess?.({ generatedPassword: "OneTime123!" });
      });
      vi.mocked(useAdminsHook.useCreateAdmin).mockReturnValue({
        mutate: createMutate,
        isPending: false,
      } as never);
      render(<SettingsPage />);

      await user.click(screen.getByText("admin.settings.admins.create.title"));
      const dialog = await screen.findByRole("dialog");
      await user.type(screen.getByLabelText("admin.settings.admins.create.fullName"), "New Admin");
      await user.type(screen.getByLabelText("admin.settings.admins.create.username"), "new_admin");
      await user.type(screen.getByLabelText("admin.settings.admins.create.phone"), "0555111111");
      await user.click(within(dialog).getByText("common.actions.add"));

      expect(createMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: "New Admin",
          username: "new_admin",
          phone: "0555111111",
        }),
        expect.anything(),
      );
      expect(await screen.findByText("OneTime123!")).toBeInTheDocument();
    });

    it("disables Delete for the signed-in admin's own row", async () => {
      const user = userEvent.setup();
      mockAdmins([admin({ id: "admin-1" }), admin({ id: "admin-2", fullName: "Admin Two" })]);
      render(<SettingsPage />);

      const triggers = screen.getAllByLabelText("common.actions.action");
      await user.click(triggers[0]);
      const menu = await screen.findByRole("menu");
      expect(
        within(menu).getByText("common.actions.delete").closest("[role='menuitem']"),
      ).toHaveAttribute("aria-disabled", "true");
    });

    it("disables Delete when only one admin remains, even if it's not the signed-in admin", async () => {
      const user = userEvent.setup();
      vi.mocked(useSessionHook.useSession).mockReturnValue({
        data: { id: "someone-else", username: "x", role: "ADMIN", fullName: "X" },
        isLoading: false,
        isError: false,
      } as never);
      mockAdmins([admin({ id: "admin-1" })]);
      render(<SettingsPage />);

      await user.click(screen.getByLabelText("common.actions.action"));
      const menu = await screen.findByRole("menu");
      expect(
        within(menu).getByText("common.actions.delete").closest("[role='menuitem']"),
      ).toHaveAttribute("aria-disabled", "true");
    });

    it("reveals the one-time password after confirming a password reset", async () => {
      const user = userEvent.setup();
      vi.mocked(useAdminsHook.useResetAdminPassword).mockReturnValue({
        mutate: (_id: string, opts?: { onSuccess?: (d: unknown) => void }) =>
          opts?.onSuccess?.({ generatedPassword: "Reset999!" }),
        isPending: false,
      } as never);
      mockAdmins([admin({ id: "admin-2", fullName: "Admin Two" })]);
      vi.mocked(useSessionHook.useSession).mockReturnValue({
        data: { id: "admin-1", username: "admin1", role: "ADMIN", fullName: "Admin One" },
        isLoading: false,
        isError: false,
      } as never);
      render(<SettingsPage />);

      await user.click(screen.getByLabelText("common.actions.action"));
      const menu = await screen.findByRole("menu");
      await user.click(within(menu).getByText("common.actions.resetPassword"));
      const dialog = await screen.findByRole("alertdialog");
      await user.click(within(dialog).getByText("common.actions.resetPassword"));

      expect(await screen.findByText("Reset999!")).toBeInTheDocument();
    });
  });

  describe("Commission tab", () => {
    async function goToCommissionTab(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByText("admin.settings.tabs.commission"));
    }

    const MATRIX = {
      tiers: [{ id: "tier-1", key: "T1", label: "0-30 min", nbMinuteMin: 0, nbMinuteMax: 30 }],
      rows: [
        {
          planId: "plan-1",
          planLabel: "Snap+ 1mo",
          cells: [{ commissionDurationId: "tier-1", commission: 100 }],
        },
      ],
    };

    it("editing a cell calls useUpdateCommission with the injected ids and the typed amount", async () => {
      const user = userEvent.setup();
      const updateMutate = vi.fn();
      vi.mocked(useSubscriptionPlansHook.useCommissions).mockReturnValue({
        data: MATRIX,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never);
      vi.mocked(useSubscriptionPlansHook.useUpdateCommission).mockReturnValue({
        mutate: updateMutate,
        isPending: false,
      } as never);

      render(<SettingsPage />);
      await goToCommissionTab(user);

      await user.click(screen.getByText("100 DZD"));
      const input = screen.getByRole("spinbutton");
      await user.clear(input);
      await user.type(input, "150");
      await user.click(screen.getByLabelText("common.actions.save"));

      expect(updateMutate).toHaveBeenCalledWith(
        { subscriptionPlanId: "plan-1", commissionDurationId: "tier-1", commission: 150 },
        expect.anything(),
      );
    });

    it("reverts to the read-only view (still showing the old value) when the save fails", async () => {
      const user = userEvent.setup();
      vi.mocked(useSubscriptionPlansHook.useCommissions).mockReturnValue({
        data: MATRIX,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never);
      vi.mocked(useSubscriptionPlansHook.useUpdateCommission).mockReturnValue({
        mutate: (_cmd: unknown, opts?: { onError?: () => void }) => opts?.onError?.(),
        isPending: false,
      } as never);

      render(<SettingsPage />);
      await goToCommissionTab(user);

      await user.click(screen.getByText("100 DZD"));
      const input = screen.getByRole("spinbutton");
      await user.clear(input);
      await user.type(input, "999");
      await user.click(screen.getByLabelText("common.actions.save"));

      // Exited edit mode, reverted to the matrix's still-cached (unchanged) value.
      expect(await screen.findByText("100 DZD")).toBeInTheDocument();
      expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    });
  });

  describe("Subscription Plans tab", () => {
    it("submits the enum-driven Add Plan form and calls useCreateSubscriptionPlan", async () => {
      const user = userEvent.setup();
      const createPlanMutate = vi.fn();
      vi.mocked(useSubscriptionPlansHook.useSubscriptionPlans).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never);
      vi.mocked(useSubscriptionPlansHook.useCreateSubscriptionPlan).mockReturnValue({
        mutate: createPlanMutate,
        isPending: false,
      } as never);
      vi.mocked(useSubscriptionPlansHook.useToggleSubscriptionPlan).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as never);

      render(<SettingsPage />);
      await user.click(screen.getByText("admin.settings.tabs.subscriptionPlans"));
      await user.click(screen.getByText("admin.settings.plans.create.title"));

      const dialog = await screen.findByRole("dialog");
      const selects = within(dialog).getAllByRole("combobox");
      await user.click(selects[0]);
      await user.click(
        await screen.findByRole("option", { name: "enums.subscriptionType.SNAPCHAT_PLUS" }),
      );
      await user.click(selects[1]);
      await user.click(
        await screen.findByRole("option", { name: "enums.subscriptionDuration.ONE_MONTH" }),
      );
      await user.click(within(dialog).getByText("common.actions.add"));

      expect(createPlanMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionType: "SNAPCHAT_PLUS",
          subscriptionDuration: "ONE_MONTH",
        }),
        expect.anything(),
      );
    });
  });

  describe("Delivery Companies tab", () => {
    it("adds a company and calls useCreateDeliveryCompany", async () => {
      const user = userEvent.setup();
      const createCompanyMutate = vi.fn();
      vi.mocked(useDeliveryCompaniesHook.useDeliveryCompanies).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never);
      vi.mocked(useDeliveryCompaniesHook.useCreateDeliveryCompany).mockReturnValue({
        mutate: createCompanyMutate,
        isPending: false,
      } as never);
      vi.mocked(useDeliveryCompaniesHook.useUpdateDeliveryCompany).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as never);
      vi.mocked(useDeliveryCompaniesHook.useToggleDeliveryCompany).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as never);

      render(<SettingsPage />);
      await user.click(screen.getByText("admin.settings.tabs.deliveryCompanies"));
      await user.click(screen.getByText("admin.settings.companies.create.title"));

      const dialog = await screen.findByRole("dialog");
      await user.type(
        within(dialog).getByLabelText("admin.settings.companies.create.name"),
        "Yalidine",
      );
      await user.type(
        within(dialog).getByLabelText("admin.settings.companies.create.registeredName"),
        "Yalidine SARL",
      );
      await user.click(within(dialog).getByText("common.actions.add"));

      expect(createCompanyMutate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Yalidine", registeredName: "Yalidine SARL" }),
        expect.anything(),
      );
    });

    it("confirms toggling a company and calls useToggleDeliveryCompany.mutate with its id", async () => {
      const user = userEvent.setup();
      const toggleMutate = vi.fn();
      vi.mocked(useDeliveryCompaniesHook.useDeliveryCompanies).mockReturnValue({
        data: [
          {
            id: "company-1",
            name: "Yalidine",
            registeredName: "Yalidine SARL",
            isActive: true,
          },
        ],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never);
      vi.mocked(useDeliveryCompaniesHook.useCreateDeliveryCompany).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as never);
      vi.mocked(useDeliveryCompaniesHook.useUpdateDeliveryCompany).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as never);
      vi.mocked(useDeliveryCompaniesHook.useToggleDeliveryCompany).mockReturnValue({
        mutate: toggleMutate,
        isPending: false,
      } as never);

      render(<SettingsPage />);
      await user.click(screen.getByText("admin.settings.tabs.deliveryCompanies"));

      await user.click(screen.getByLabelText("common.actions.action"));
      const menu = await screen.findByRole("menu");
      await user.click(within(menu).getByText("common.actions.disable"));
      const dialog = await screen.findByRole("alertdialog");
      await user.click(within(dialog).getByText("common.actions.confirm"));

      expect(toggleMutate).toHaveBeenCalledWith("company-1");
    });
  });
});
