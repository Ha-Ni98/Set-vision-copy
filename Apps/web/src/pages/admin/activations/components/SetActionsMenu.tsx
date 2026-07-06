import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Printer,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Trash2,
} from "lucide-react";
import { SetStat, type SetDTO } from "@my-app/contract";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/hooks/useTranslation";
import { downloadTextFile, downloadBlob } from "@/lib/utils";
import { generateCardsPdf } from "@/lib/card-pdf";
import * as cardsService from "@/services/cards.service";

interface Props {
  set: SetDTO;
  onRequestSendToPrint: (set: SetDTO) => void;
  onRequestMarkPrinted: (set: SetDTO) => void;
  onRequestDelete: (set: SetDTO) => void;
}

// Dumb menu — gates each item off set.setStat (plan §D2.5: Send to Print only NOT_PRINTED;
// Mark Printed only PENDING_PRINTING; Delete only NOT_PRINTED|PENDING_PRINTING, cascade
// warning). "View Cards" and "Download Keys" are always available (the set's cards exist
// from creation, regardless of print status).
export function SetActionsMenu({
  set,
  onRequestSendToPrint,
  onRequestMarkPrinted,
  onRequestDelete,
}: Props) {
  const { t } = useTranslation();
  const canSendToPrint = set.setStat === SetStat.NOT_PRINTED;
  const canMarkPrinted = set.setStat === SetStat.PENDING_PRINTING;
  const canDelete = set.setStat === SetStat.NOT_PRINTED || set.setStat === SetStat.PENDING_PRINTING;

  const [isDownloading, setIsDownloading] = useState(false);
  const onDownloadKeys = async () => {
    setIsDownloading(true);
    try {
      const keys = await cardsService.getAllKeysForSet(set.setNumber);
      if (keys.length === 0) {
        toast.error(t("admin.setsLots.sets.actions.downloadKeysEmptyToast"));
        return;
      }
      downloadTextFile(`set-${set.setNumber}-keys.txt`, keys.join("\n"));
    } catch {
      toast.error(t("admin.setsLots.sets.actions.downloadKeysErrorToast"));
    } finally {
      setIsDownloading(false);
    }
  };

  const [isPrinting, setIsPrinting] = useState(false);
  const onPrintPdf = async () => {
    setIsPrinting(true);
    try {
      const keys = await cardsService.getAllKeysForSet(set.setNumber);
      if (keys.length === 0) {
        toast.error(t("admin.setsLots.sets.actions.downloadKeysEmptyToast"));
        return;
      }
      const pdfBytes = await generateCardsPdf(keys);
      downloadBlob(`set-${set.setNumber}-cards.pdf`, new Blob([pdfBytes], { type: "application/pdf" }));
    } catch {
      toast.error(t("admin.setsLots.sets.actions.printPdfErrorToast"));
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("common.actions.action")}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/admin/activations/cards?set=${set.setNumber}`}>
            <CreditCard className="mr-2 h-4 w-4" /> {t("common.actions.viewCards")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isDownloading} onClick={onDownloadKeys}>
          <Download className="mr-2 h-4 w-4" />
          {t(
            isDownloading
              ? "admin.setsLots.sets.actions.downloadingKeys"
              : "admin.setsLots.sets.actions.downloadKeys",
          )}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isPrinting} onClick={onPrintPdf}>
          <FileText className="mr-2 h-4 w-4" />
          {t(
            isPrinting
              ? "admin.setsLots.sets.actions.printingPdf"
              : "admin.setsLots.sets.actions.printPdf",
          )}
        </DropdownMenuItem>
        {canSendToPrint && (
          <DropdownMenuItem onClick={() => onRequestSendToPrint(set)}>
            <Printer className="mr-2 h-4 w-4" /> {t("common.actions.sendToPrint")}
          </DropdownMenuItem>
        )}
        {canMarkPrinted && (
          <DropdownMenuItem onClick={() => onRequestMarkPrinted(set)}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> {t("common.actions.markPrinted")}
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onRequestDelete(set)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> {t("common.actions.delete")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
