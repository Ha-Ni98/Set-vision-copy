import type { NotificationDTO } from "@my-app/contract";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  notification: NotificationDTO | null;
  onOpenChange: (open: boolean) => void;
}

// Bodies are multi-line and can carry the client's Snapchat credentials in the clear (D3 /
// Set 6 scope) — shown in full, read-only, no truncation.
export function NotificationBodyDialog({ notification, onOpenChange }: Props) {
  const { t } = useTranslation();

  return (
    <Dialog open={notification !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.notifications.body.title")}</DialogTitle>
          <DialogDescription>{notification?.recipientName}</DialogDescription>
        </DialogHeader>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-sm text-foreground">
          {notification?.body}
        </pre>
        {notification?.error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {notification.error}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
