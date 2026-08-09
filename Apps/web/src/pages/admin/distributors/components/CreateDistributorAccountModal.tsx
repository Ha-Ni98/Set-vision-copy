import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/hooks/useTranslation";
import { GeneratedPasswordPanel } from "../../activators/components/GeneratedPasswordPanel";
import {
  createDistributorAccountSchema,
  type CreateDistributorAccountFormValues,
  type CreateDistributorAccountFormInput,
} from "./create-distributor-account.schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateDistributorAccountFormValues) => void;
  isPending?: boolean;
  /** Set once the create mutation succeeds — swaps the form for the one-time reveal. */
  generatedPassword?: string | null;
}

// Mirrors CreateActivatorModal component-for-component (Set 1 plan.md §5.8) — nothing new
// invented, just the distributor's equivalent of the same admin-creates-a-login flow.
export function CreateDistributorAccountModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  generatedPassword,
}: Props) {
  const { t } = useTranslation();
  const [showPwd, setShowPwd] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateDistributorAccountFormInput, unknown, CreateDistributorAccountFormValues>({
    resolver: zodResolver(createDistributorAccountSchema(t)),
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.distributors.account.createTitle")}</DialogTitle>
        </DialogHeader>

        {generatedPassword ? (
          <>
            <GeneratedPasswordPanel
              password={generatedPassword}
              titleKey="admin.distributors.account.successTitle"
              bodyKey="admin.distributors.account.successBody"
            />
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>{t("common.actions.confirm")}</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-distributor-account-username">
                {t("admin.distributors.account.username")}
              </Label>
              <Input id="create-distributor-account-username" {...register("username")} />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-distributor-account-password">
                {t("admin.distributors.account.password")}
              </Label>
              <div className="relative">
                <Input
                  id="create-distributor-account-password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="new-password"
                  className="pe-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={t(showPwd ? "auth.login.hidePassword" : "auth.login.showPassword")}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password ? (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t("admin.distributors.account.passwordHelper")}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.actions.cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {t("common.actions.add")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
