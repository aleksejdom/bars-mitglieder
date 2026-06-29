"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Download,
  Bell,
  Mail,
  MailCheck,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

type InvoiceActionsProps = {
  invoiceId: string;
  invoiceNumber: string;
  type: string;
  status: string;
  emailSentAt: string | null;
  paidAction: () => Promise<void>;
  overdueAction: () => Promise<void>;
  deleteAction: () => Promise<void>;
  reminderAction: () => Promise<void>;
  sendAction: () => Promise<{ error?: string }>;
};

export function InvoiceActions({
  invoiceId,
  invoiceNumber,
  type,
  status,
  emailSentAt,
  paidAction,
  overdueAction,
  deleteAction,
  reminderAction,
  sendAction,
}: InvoiceActionsProps) {
  const [isPending, startTransition] = useTransition();

  function run(
    action: () => Promise<void>,
    successMsg: string,
    errorMsg?: string
  ) {
    startTransition(async () => {
      try {
        await action();
        toast.success(successMsg);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error(errorMsg ?? "Fehler", { description: msg });
      }
    });
  }

  return (
    <div className={`flex items-center gap-1 justify-end ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
      {status !== "paid" && (
        <button
          type="button"
          title="Als bezahlt markieren"
          onClick={() => run(paidAction, `Rechnung ${invoiceNumber} als bezahlt markiert`)}
          className="p-1.5 rounded hover:bg-green-100 hover:text-green-700 transition-colors"
        >
          <CheckCircle2 className="w-4 h-4" />
        </button>
      )}

      {status === "pending" && (
        <button
          type="button"
          title="Als überfällig markieren"
          onClick={() => run(overdueAction, `Rechnung ${invoiceNumber} als überfällig markiert`)}
          className="p-1.5 rounded hover:bg-yellow-100 hover:text-yellow-700 transition-colors"
        >
          <AlertTriangle className="w-4 h-4" />
        </button>
      )}

      {status !== "paid" && status !== "cancelled" && type !== "final_reminder" && (
        <button
          type="button"
          title={type === "reminder" ? "Letzte Mahnung erstellen" : "Mahnung erstellen"}
          onClick={() =>
            run(
              reminderAction,
              type === "reminder"
                ? "Letzte Mahnung erstellt und E-Mail gesendet"
                : "Mahnung erstellt und E-Mail gesendet"
            )
          }
          className="p-1.5 rounded hover:bg-orange-100 hover:text-orange-700 transition-colors"
        >
          <Bell className="w-4 h-4" />
        </button>
      )}

      <button
        type="button"
        title={emailSentAt ? "E-Mail erneut senden" : "E-Mail senden"}
        onClick={() => {
          startTransition(async () => {
            try {
              const result = await sendAction();
              if (result?.error) {
                toast.error("E-Mail konnte nicht gesendet werden", {
                  description: result.error,
                });
              } else {
                toast.success(`E-Mail für ${invoiceNumber} erfolgreich gesendet`);
              }
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              toast.error("E-Mail konnte nicht gesendet werden", { description: msg });
            }
          });
        }}
        className="p-1.5 rounded hover:bg-blue-100 hover:text-blue-700 transition-colors"
      >
        {emailSentAt ? (
          <MailCheck className="w-4 h-4 text-green-600" />
        ) : (
          <Mail className="w-4 h-4" />
        )}
      </button>

      <button
        type="button"
        title="Löschen"
        onClick={() => run(deleteAction, `Rechnung ${invoiceNumber} gelöscht`, "Löschen fehlgeschlagen")}
        className="p-1.5 rounded hover:bg-red-100 hover:text-red-700 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <a
        href={`/api/invoices/${invoiceId}/pdf`}
        target="_blank"
        rel="noopener noreferrer"
        title="PDF herunterladen"
        className="p-1.5 rounded hover:bg-blue-100 hover:text-blue-700 transition-colors inline-flex"
      >
        <Download className="w-4 h-4" />
      </a>
    </div>
  );
}

// E-Mail-Status-Zelle
export function EmailStatusCell({ emailSentAt }: { emailSentAt: string | null }) {
  if (!emailSentAt) return <span className="text-xs text-muted-foreground/50">—</span>;
  return (
    <span
      title={`Gesendet: ${formatDate(emailSentAt)}`}
      className="inline-flex items-center gap-1 text-xs text-green-600"
    >
      <MailCheck className="w-3.5 h-3.5" />
      {formatDate(emailSentAt)}
    </span>
  );
}
