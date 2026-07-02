import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  open: boolean;
  action: "activate" | "cancel";
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

// Purely presentational — the row that opened it and the actual mutate() call are owned by
// the caller (FrozenActivationsTable); this only renders the confirm copy per action variant.
export function ResolveFreezeDialog({ open, action, onOpenChange, onConfirm }: Props) {
  const { t } = useTranslation();
  const isCancel = action === "cancel";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isCancel
              ? t("admin.dashboard.frozen.cancelConfirm.title")
              : t("admin.dashboard.frozen.activateConfirm.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isCancel
              ? t("admin.dashboard.frozen.cancelConfirm.body")
              : t("admin.dashboard.frozen.activateConfirm.body")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              isCancel
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
          >
            {isCancel ? t("common.actions.cancel") : t("common.actions.activate")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
