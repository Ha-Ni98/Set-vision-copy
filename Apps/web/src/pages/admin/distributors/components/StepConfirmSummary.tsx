import { DeliveryType } from "@my-app/contract";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDZD } from "@/lib/utils";

interface Props {
  distributorName?: string;
  lotsCount: number;
  cardsTotal: number;
  receivedName?: string;
  receivedPhone?: string;
  wilayaName?: string;
  communeName?: string;
  deliveryCompanyName?: string;
  deliveryType?: DeliveryType;
  orderPrice?: number;
  deliverPrice?: number;
}

// Step 5 of the create-order wizard — pure review screen, no inputs. The host wires real
// selected values in Sprint 3; here every field falls back to an em dash.
export function StepConfirmSummary({
  distributorName,
  lotsCount,
  cardsTotal,
  receivedName,
  receivedPhone,
  wilayaName,
  communeName,
  deliveryCompanyName,
  deliveryType,
  orderPrice,
  deliverPrice,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dash = "—";

  const rows: [string, string][] = [
    [t("admin.orders.create.steps.selectDistributor"), distributorName ?? dash],
    [t("admin.orders.create.steps.selectLots"), `${lotsCount} · ${cardsTotal}`],
    [t("admin.orders.create.receivedName"), receivedName ?? dash],
    [t("admin.orders.create.receivedPhone"), receivedPhone ?? dash],
    [t("admin.orders.create.wilaya"), wilayaName ?? dash],
    [t("admin.orders.create.commune"), communeName ?? dash],
    [t("admin.orders.create.deliveryCompany"), deliveryCompanyName ?? dash],
    [
      t("admin.orders.create.deliveryType"),
      deliveryType ? t(`enums.deliveryType.${deliveryType}`) : dash,
    ],
    [
      t("admin.orders.create.orderPrice"),
      orderPrice != null ? formatDZD(orderPrice, language) : dash,
    ],
    [
      t("admin.orders.create.deliverPrice"),
      deliverPrice != null ? formatDZD(deliverPrice, language) : dash,
    ],
  ];

  return (
    <div className="flex flex-col gap-2 text-sm">
      <h3 className="font-semibold text-foreground">{t("admin.orders.create.summaryTitle")}</h3>
      <dl className="divide-y divide-border rounded-xl border border-border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between p-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
