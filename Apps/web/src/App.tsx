import { lazy, Suspense, useEffect, type LazyExoticComponent, type JSX } from "react";
import { createBrowserRouter, Link, RouterProvider } from "react-router-dom";
import { UserRole } from "@my-app/contract";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { ActivatorLayout } from "@/components/layout/ActivatorLayout";
import { DistributorLayout } from "@/components/layout/DistributorLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "@/components/layout/AdminGuard";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/layout/ProtectedRoute";
import { PageLoader } from "@/components/shared/PageLoader";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { RouteErrorBoundary } from "@/components/shared/RouteErrorBoundary";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthProvider";
import { useSession } from "@/hooks/useSession";
import { ActivationProvider } from "@/components/providers/ActivationProvider";
import { useTranslation } from "@/hooks/useTranslation";
import { setRedirect } from "@/lib/axios";

const LandingPage = lazy(() => import("@/pages/LandingPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const DashboardPage = lazy(() => import("@/pages/activator/DashboardPage"));
const RequestsPage = lazy(() => import("@/pages/activator/RequestsPage"));
const HistoryPage = lazy(() => import("@/pages/activator/HistoryPage"));
const PortalPage = lazy(() => import("@/pages/distributor/PortalPage"));

const AdminDashboardPage = lazy(() => import("@/pages/admin/DashboardPage"));
const AdminActivatorsPage = lazy(() => import("@/pages/admin/activators/ActivatorsPage"));
const AdminActivatorDetailPage = lazy(() => import("@/pages/admin/activators/ActivatorDetailPage"));
const AdminDistributorsPage = lazy(() => import("@/pages/admin/distributors/DistributorsPage"));
const AdminDistributorDetailPage = lazy(
  () => import("@/pages/admin/distributors/DistributorDetailPage"),
);
const AdminOrdersPage = lazy(() => import("@/pages/admin/distributors/OrdersPage"));
const AdminSetsLotsPage = lazy(() => import("@/pages/admin/activations/SetsLotsPage"));
const AdminCardsPage = lazy(() => import("@/pages/admin/activations/CardsPage"));
const AdminActivationsPage = lazy(() => import("@/pages/admin/activations/ActivationsPage"));
const AdminActivationDetailPage = lazy(
  () => import("@/pages/admin/activations/ActivationDetailPage"),
);
const AdminStatisticsPage = lazy(() => import("@/pages/admin/statistics/StatisticsPage"));
const AdminSettingsPage = lazy(() => import("@/pages/admin/settings/SettingsPage"));
const AdminLogsPage = lazy(() => import("@/pages/admin/logs/LogsPage"));

const withSuspense = (Component: LazyExoticComponent<() => JSX.Element>) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

// Not a matched child route, so it can't rely on <Outlet/> resolving to a page — it picks
// the layout that matches the current session's role and passes 404 content in as children.
function CatchAllRoute() {
  const { isAuthenticated } = useAuth();
  const { data: session } = useSession();
  const { t } = useTranslation();
  const content = (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <NotFoundState
        eyebrow="404"
        title={t("common.errors.notFoundTitle")}
        body={t("common.errors.notFoundBody")}
        action={
          <Button asChild>
            <Link to="/">{t("common.actions.goHome")}</Link>
          </Button>
        }
      />
    </div>
  );

  if (!isAuthenticated) {
    // PublicHeader reads useActivation() for its logo's reset-on-click — this standalone
    // (non-nested-route) PublicLayout usage needs the same provider the router's own
    // PublicLayout route gets, or that hook throws.
    return (
      <ActivationProvider>
        <PublicLayout>{content}</PublicLayout>
      </ActivationProvider>
    );
  }

  switch (session?.role) {
    case UserRole.ADMIN:
      return <AdminLayout>{content}</AdminLayout>;
    case UserRole.DISTRIBUTOR:
      return <DistributorLayout>{content}</DistributorLayout>;
    default:
      return <ActivatorLayout>{content}</ActivatorLayout>;
  }
}

const router = createBrowserRouter([
  {
    // Wraps the shell so PublicHeader's logo can reset the in-progress activation flow
    // (client-portal plan.md §D1) on click, not just navigate — LandingPage itself doesn't
    // consume this context's data yet (that's Sprint 3's job).
    element: (
      <ActivationProvider>
        <PublicLayout />
      </ActivationProvider>
    ),
    children: [
      { index: true, element: withSuspense(LandingPage), errorElement: <RouteErrorBoundary /> },
    ],
  },
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        path: "/login",
        element: withSuspense(LoginPage),
        errorElement: (
          <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="w-full max-w-md">
              <RouteErrorBoundary />
            </div>
          </div>
        ),
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <RoleGuard allow={[UserRole.ACTIVATOR]} />,
        children: [
          {
            element: <ActivatorLayout />,
            children: [
              {
                path: "/dashboard",
                element: withSuspense(DashboardPage),
                errorElement: <RouteErrorBoundary />,
              },
              {
                path: "/requests",
                element: withSuspense(RequestsPage),
                errorElement: <RouteErrorBoundary />,
              },
              {
                path: "/history",
                element: withSuspense(HistoryPage),
                errorElement: <RouteErrorBoundary />,
              },
            ],
          },
        ],
      },
      {
        element: <RoleGuard allow={[UserRole.DISTRIBUTOR]} />,
        children: [
          {
            element: <DistributorLayout />,
            children: [
              {
                path: "/portal",
                element: withSuspense(PortalPage),
                errorElement: <RouteErrorBoundary />,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    element: <AdminGuard />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            path: "/admin",
            element: withSuspense(AdminDashboardPage),
            errorElement: <RouteErrorBoundary />,
          },
          {
            path: "/admin/activators",
            element: withSuspense(AdminActivatorsPage),
            errorElement: <RouteErrorBoundary />,
          },
          {
            path: "/admin/activators/:id",
            element: withSuspense(AdminActivatorDetailPage),
            errorElement: <RouteErrorBoundary />,
          },
          {
            path: "/admin/distributors",
            element: withSuspense(AdminDistributorsPage),
            errorElement: <RouteErrorBoundary />,
          },
          {
            // Static sibling declared ahead of the dynamic ":id" below — React Router ranks
            // static segments above params, so "orders" resolves here, not the :id route
            // (plan.md §C routing precedence note).
            path: "/admin/distributors/orders",
            element: withSuspense(AdminOrdersPage),
            errorElement: <RouteErrorBoundary />,
          },
          {
            path: "/admin/distributors/:id",
            element: withSuspense(AdminDistributorDetailPage),
            errorElement: <RouteErrorBoundary />,
          },
          {
            path: "/admin/activations",
            element: withSuspense(AdminActivationsPage),
            errorElement: <RouteErrorBoundary />,
          },
          {
            path: "/admin/activations/sets-lots",
            element: withSuspense(AdminSetsLotsPage),
            errorElement: <RouteErrorBoundary />,
          },
          {
            path: "/admin/activations/cards",
            element: withSuspense(AdminCardsPage),
            errorElement: <RouteErrorBoundary />,
          },
          {
            // Dynamic sibling of the two static routes above — declared after them so
            // React Router's static-over-dynamic ranking resolves "sets-lots"/"cards"
            // correctly instead of matching here (plan.md §C routing precedence note).
            path: "/admin/activations/:id",
            element: withSuspense(AdminActivationDetailPage),
            errorElement: <RouteErrorBoundary />,
          },
          {
            path: "/admin/statistics",
            element: withSuspense(AdminStatisticsPage),
            errorElement: <RouteErrorBoundary />,
          },
          {
            path: "/admin/settings",
            element: withSuspense(AdminSettingsPage),
            errorElement: <RouteErrorBoundary />,
          },
          {
            path: "/admin/logs",
            element: withSuspense(AdminLogsPage),
            errorElement: <RouteErrorBoundary />,
          },
        ],
      },
    ],
  },
  { path: "*", element: <CatchAllRoute /> },
]);

// Bridges the axios 401 interceptor to React Router's navigation, registered once here
// rather than via a hook, since the interceptor lives outside any component tree.
setRedirect((path) => router.navigate(path));

export default function App() {
  const { t } = useTranslation();
  // The MVP only ever set one site-wide title (at the root route, never per-page) —
  // this keeps that behavior, just reactive to the language toggle.
  useEffect(() => {
    document.title = t("common.brand.pageTitle");
  }, [t]);

  return <RouterProvider router={router} />;
}
