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
import { GeneratedPasswordPanel } from "./GeneratedPasswordPanel";
import {
  createActivatorSchema,
  type CreateActivatorFormValues,
  type CreateActivatorFormInput,
} from "./create-activator.schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateActivatorFormValues) => void;
  isPending?: boolean;
  /** Set once the create mutation succeeds — swaps the form for the one-time reveal. */
  generatedPassword?: string | null;
}

export function CreateActivatorModal({
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
  } = useForm<CreateActivatorFormInput, unknown, CreateActivatorFormValues>({
    resolver: zodResolver(createActivatorSchema(t)),
    defaultValues: { fullName: "", username: "", phone: "", initialCredits: 0, password: "" },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.activators.create.title")}</DialogTitle>
        </DialogHeader>

        {generatedPassword ? (
          <>
            <GeneratedPasswordPanel password={generatedPassword} />
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>{t("common.actions.confirm")}</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-activator-fullname">
                {t("admin.activators.create.fullName")}
              </Label>
              <Input id="create-activator-fullname" {...register("fullName")} />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-activator-username">
                {t("admin.activators.create.username")}
              </Label>
              <Input id="create-activator-username" {...register("username")} />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-activator-phone">{t("admin.activators.create.phone")}</Label>
              <Input id="create-activator-phone" type="tel" {...register("phone")} />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-activator-credits">
                {t("admin.activators.create.initialCredits")}
              </Label>
              <Input
                id="create-activator-credits"
                type="number"
                min={0}
                step={1}
                {...register("initialCredits")}
              />
              {errors.initialCredits && (
                <p className="text-sm text-destructive">{errors.initialCredits.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-activator-password">
                {t("admin.activators.create.password")}
              </Label>
              <div className="relative">
                <Input
                  id="create-activator-password"
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
                  {t("admin.activators.create.passwordHelper")}
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
