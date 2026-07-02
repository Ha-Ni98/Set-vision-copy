import { Link, useRouteError } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";

// errorElement content for a route nested inside a layout — content-scoped, so the
// surrounding header/sidebar/footer keep rendering (rules §4: layout survives errors).
export function RouteErrorBoundary() {
  const { t } = useTranslation();
  const error = useRouteError();
  const message = error instanceof Error ? error.message : String(error);

  return (
    <NotFoundState
      icon={<AlertTriangle className="h-8 w-8" />}
      title={t("common.errors.crashTitle")}
      body={t("common.errors.crashBody")}
      debugDetails={import.meta.env.DEV ? message : undefined}
      action={
        <>
          <Button onClick={() => window.location.reload()}>{t("common.actions.tryAgain")}</Button>
          <Button variant="outline" asChild>
            <Link to="/">{t("common.actions.goHome")}</Link>
          </Button>
        </>
      }
    />
  );
}
