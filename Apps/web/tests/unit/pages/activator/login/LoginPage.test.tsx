import "../../../../fixtures/wrappers/mockTranslation";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import LoginPage from "@/pages/LoginPage";
import * as AuthProviderModule from "@/components/providers/AuthProvider";

vi.mock("@/components/providers/AuthProvider");

function mockAuth(overrides: Partial<ReturnType<typeof AuthProviderModule.useAuth>> = {}) {
  vi.mocked(AuthProviderModule.useAuth).mockReturnValue({
    isAuthenticated: false,
    isReady: true,
    displayName: null,
    login: vi.fn().mockResolvedValue(undefined),
    isLoggingIn: false,
    logout: vi.fn(),
    ...overrides,
  } as never);
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  it("shows inline validation errors and never calls login when both fields are empty", async () => {
    const user = userEvent.setup();
    const login = vi.fn();
    mockAuth({ login });
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "auth.login.submit" }));

    expect(await screen.findAllByText("auth.login.emptyFields")).toHaveLength(2);
    expect(login).not.toHaveBeenCalled();
  });

  it("submits the typed credentials and calls login with the command", async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue(undefined);
    mockAuth({ login });
    render(<LoginPage />);

    await user.type(screen.getByLabelText("auth.login.username"), "test_act_007004");
    await user.type(screen.getByLabelText("auth.login.password"), "s3cret!");
    await user.click(screen.getByRole("button", { name: "auth.login.submit" }));

    expect(login).toHaveBeenCalledWith({ username: "test_act_007004", password: "s3cret!" });
  });

  it("shows the lockout message on a 429", async () => {
    const user = userEvent.setup();
    const err = new AxiosError("Too Many Requests", "429");
    err.response = { status: 429 } as never;
    mockAuth({ login: vi.fn().mockRejectedValue(err) });
    render(<LoginPage />);

    await user.type(screen.getByLabelText("auth.login.username"), "a");
    await user.type(screen.getByLabelText("auth.login.password"), "b");
    await user.click(screen.getByRole("button", { name: "auth.login.submit" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("auth.login.lockout");
  });

  it("shows the network-error message when the request never got a response", async () => {
    const user = userEvent.setup();
    const err = new AxiosError("Network Error");
    mockAuth({ login: vi.fn().mockRejectedValue(err) });
    render(<LoginPage />);

    await user.type(screen.getByLabelText("auth.login.username"), "a");
    await user.type(screen.getByLabelText("auth.login.password"), "b");
    await user.click(screen.getByRole("button", { name: "auth.login.submit" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("auth.login.network");
  });

  it("shows the generic error message on a 401", async () => {
    const user = userEvent.setup();
    const err = new AxiosError("Unauthorized", "401");
    err.response = { status: 401 } as never;
    mockAuth({ login: vi.fn().mockRejectedValue(err) });
    render(<LoginPage />);

    await user.type(screen.getByLabelText("auth.login.username"), "a");
    await user.type(screen.getByLabelText("auth.login.password"), "b");
    await user.click(screen.getByRole("button", { name: "auth.login.submit" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("auth.login.error");
  });

  it("disables the submit button and shows a spinner while logging in", () => {
    mockAuth({ isLoggingIn: true });
    render(<LoginPage />);

    expect(screen.getByRole("button", { name: /auth.login.submitting/ })).toBeDisabled();
  });
});
