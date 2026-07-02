import { useEffect } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ActivatorShell } from "@/components/layout/ActivatorShell";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/activator/DashboardPage";
import RequestsPage from "@/pages/activator/RequestsPage";
import HistoryPage from "@/pages/activator/HistoryPage";
import ErrorPage from "@/pages/ErrorPage";
import NotFoundPage from "@/pages/NotFoundPage";
import { useTranslation } from "@/hooks/useTranslation";

const router = createBrowserRouter([
  { path: "/", element: <LandingPage />, errorElement: <ErrorPage /> },
  { path: "/login", element: <LoginPage />, errorElement: <ErrorPage /> },
  {
    path: "/dashboard",
    element: (
      <ActivatorShell>
        <DashboardPage />
      </ActivatorShell>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: "/requests",
    element: (
      <ActivatorShell>
        <RequestsPage />
      </ActivatorShell>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: "/history",
    element: (
      <ActivatorShell>
        <HistoryPage />
      </ActivatorShell>
    ),
    errorElement: <ErrorPage />,
  },
  { path: "*", element: <NotFoundPage /> },
]);

export default function App() {
  const { t } = useTranslation();
  // The MVP only ever set one site-wide title (at the root route, never per-page) —
  // this keeps that behavior, just reactive to the language toggle.
  useEffect(() => {
    document.title = t("common.brand.pageTitle");
  }, [t]);

  return <RouterProvider router={router} />;
}
