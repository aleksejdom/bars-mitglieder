import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  markInvoicePaid,
  markInvoiceOverdue,
  deleteInvoice,
  createInvoice,
} from "@/lib/actions/accounting";
import { Plus, FileText, CheckCircle2, AlertTriangle, Trash2, Send, Download } from "lucide-react";

type Invoice = {
  id: string;
  invoice_number: string;
  type: string;
  member_id: string;
  first_name: string;
  last_name: string;
  amount: number;
  status: string;
  due_date: string;
  paid_date: string;
  created_at: string;
};

const typeLabel: Record<string, string> = {
  invoice: "Rechnung",
  reminder: "Mahnung",
  final_reminder: "Letzte Mahnung",
};

const statusInfo: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "secondary" | "outline" }> = {
  pending: { label: "Offen", variant: "warning" },
  paid: { label: "Bezahlt", variant: "success" },
  overdue: { label: "Überfällig", variant: "destructive" },
  cancelled: { label: "Storniert", variant: "secondary" },
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; member?: string }>;
}) {
  await requireAuth();
  const params = await searchParams;

  const invoices = await query<Invoice>(`
    SELECT i.id, i.invoice_number, i.type, i.member_id,
           m.first_name, m.last_name, i.amount, i.status,
           i.due_date, i.paid_date, i.created_at
    FROM invoices i JOIN members m ON i.member_id=m.id
    WHERE
      ($1 = '' OR i.status=$1)
      AND ($2 = '' OR i.type=$2)
      AND ($3 = '' OR i.member_id=$3::uuid)
    ORDER BY i.created_at DESC
    LIMIT 100
  `, [params.status || "", params.type || "", params.member || ""]);

  const members = await query<{ id: string; first_name: string; last_name: string }>(
    "SELECT id, first_name, last_name FROM members WHERE status='active' ORDER BY last_name"
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Rechnungen & Mahnungen</h1>
            <p className="text-muted-foreground text-sm">{invoices.length} Einträge</p>
          </div>
        </div>
      </div>

      {/* New Invoice Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Neue Rechnung / Mahnung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createInvoice} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium">Mitglied *</label>
              <select
                name="member_id"
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Auswählen...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.last_name}, {m.first_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Typ</label>
              <select
                name="type"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="invoice">Rechnung</option>
                <option value="reminder">Mahnung</option>
                <option value="final_reminder">Letzte Mahnung</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Betrag (€) *</label>
              <input
                type="number"
                name="amount"
                required
                min="0.01"
                step="0.01"
                placeholder="45.00"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Zeitraum von</label>
              <input
                type="date"
                name="period_start"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Bis</label>
              <input
                type="date"
                name="period_end"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Fällig am</label>
              <input
                type="date"
                name="due_date"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="col-span-2 sm:col-span-3 lg:col-span-6">
              <Button type="submit" size="sm">
                <Send className="w-4 h-4 mr-2" />
                Rechnung erstellen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Filters */}
      <form method="GET" className="flex gap-3 flex-wrap">
        <select
          name="status"
          defaultValue={params.status || ""}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Alle Status</option>
          <option value="pending">Offen</option>
          <option value="paid">Bezahlt</option>
          <option value="overdue">Überfällig</option>
        </select>
        <select
          name="type"
          defaultValue={params.type || ""}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Alle Typen</option>
          <option value="invoice">Rechnungen</option>
          <option value="reminder">Mahnungen</option>
          <option value="final_reminder">Letzte Mahnung</option>
        </select>
        <Button type="submit" variant="secondary" size="sm">Filtern</Button>
      </form>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground text-xs">Nr.</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground text-xs">Typ</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground text-xs">Mitglied</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground text-xs">Betrag</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground text-xs">Fällig</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground text-xs">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      Keine Rechnungen gefunden
                    </td>
                  </tr>
                )}
                {invoices.map((inv) => {
                  const s = statusInfo[inv.status] || { label: inv.status, variant: "outline" as const };
                  const paidAction = markInvoicePaid.bind(null, inv.id);
                  const overdueAction = markInvoiceOverdue.bind(null, inv.id);
                  const deleteAction = deleteInvoice.bind(null, inv.id);

                  return (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                        {inv.invoice_number}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs">
                          {typeLabel[inv.type] || inv.type}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium">
                        {inv.first_name} {inv.last_name}
                      </td>
                      <td className="px-5 py-3 font-semibold">
                        {formatCurrency(inv.amount)}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">
                        {inv.due_date ? formatDate(inv.due_date) : "—"}
                        {inv.paid_date && (
                          <div className="text-green-600">
                            Bezahlt: {formatDate(inv.paid_date)}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={s.variant}>{s.label}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {inv.status !== "paid" && (
                            <form action={paidAction}>
                              <button
                                type="submit"
                                title="Als bezahlt markieren"
                                className="p-1.5 rounded hover:bg-green-100 hover:text-green-700 transition-colors"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            </form>
                          )}
                          {inv.status === "pending" && (
                            <form action={overdueAction}>
                              <button
                                type="submit"
                                title="Als überfällig markieren"
                                className="p-1.5 rounded hover:bg-yellow-100 hover:text-yellow-700 transition-colors"
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </button>
                            </form>
                          )}
                          <form action={deleteAction}>
                            <button
                              type="submit"
                              title="Löschen"
                              className="p-1.5 rounded hover:bg-red-100 hover:text-red-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </form>
                          <a
                            href={`/api/invoices/${inv.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="PDF herunterladen"
                            className="p-1.5 rounded hover:bg-blue-100 hover:text-blue-700 transition-colors inline-flex"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
