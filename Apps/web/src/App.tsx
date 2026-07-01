import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ActivatorShell } from "@/components/layout/ActivatorShell";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/activator/DashboardPage";
import RequestsPage from "@/pages/activator/RequestsPage";
import HistoryPage from "@/pages/activator/HistoryPage";
import ErrorPage from "@/pages/ErrorPage";
import NotFoundPage from "@/pages/NotFoundPage";

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
  return <RouterProvider router={router} />;
}
