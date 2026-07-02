import { lazy, Suspense, useEffect, type LazyExoticComponent, type JSX } from "react";
import { createBrowserRouter, Link, RouterProvider } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { ActivatorLayout } from "@/components/layout/ActivatorLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "@/components/layout/AdminGuard";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/layout/ProtectedRoute";
import { PageLoader } from "@/components/shared/PageLoader";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { RouteErrorBoundary } from "@/components/shared/RouteErrorBoundary";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthProvider";
import { useTranslation } from "@/hooks/useTranslation";
import { setRedirect } from "@/lib/axios";

const LandingPage = lazy(() => import("@/pages/LandingPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const DashboardPage = lazy(() => import("@/pages/activator/DashboardPage"));
const RequestsPage = lazy(() => import("@/pages/activator/RequestsPage"));
const HistoryPage = lazy(() => import("@/pages/activator/HistoryPage"));

const AdminDashboardPage = lazy(() => import("@/pages/admin/DashboardPage"));
const AdminActivatorsPage = lazy(() => import("@/pages/admin/activators/ActivatorsPage"));
const AdminActivatorDetailPage = lazy(() => import("@/pages/admin/activators/ActivatorDetailPage"));
const AdminDistributorsPage = lazy(() => import("@/pages/admin/distributors/DistributorsPage"));
const AdminDistributorDetailPage = lazy(
  () => import("@/pages/admin/distributors/DistributorDetailPage"),
);

const withSuspense = (Component: LazyExoticComponent<() => JSX.Element>) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

// Not a matched child route, so it can't rely on <Outlet/> resolving to a page — it picks
// the layout that matches the current session and passes 404 content in as children.
function CatchAllRoute() {
  const { isAuthenticated } = useAuth();
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
  return isAuthenticated ? (
    <ActivatorLayout>{content}</ActivatorLayout>
  ) : (
    <PublicLayout>{content}</PublicLayout>
  );
}

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
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
            path: "/admin/distributors/:id",
            element: withSuspense(AdminDistributorDetailPage),
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
