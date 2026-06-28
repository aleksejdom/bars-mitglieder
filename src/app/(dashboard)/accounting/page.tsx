import { query, queryOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { generateMonthlyInvoices } from "@/lib/actions/accounting";
import {
  Euro,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  FileText,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default async function AccountingPage() {
  await requireAuth();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [overview, monthly, topOverdue] = await Promise.all([
    queryOne<{
      total_invoiced: string;
      total_paid: string;
      total_pending: string;
      total_overdue: string;
      invoices_count: string;
      paid_count: string;
    }>(`
      SELECT
        COALESCE(SUM(amount),0) as total_invoiced,
        COALESCE(SUM(CASE WHEN status='paid' THEN amount END),0) as total_paid,
        COALESCE(SUM(CASE WHEN status='pending' THEN amount END),0) as total_pending,
        COALESCE(SUM(CASE WHEN status='overdue' THEN amount END),0) as total_overdue,
        COUNT(*) as invoices_count,
        COUNT(CASE WHEN status='paid' THEN 1 END) as paid_count
      FROM invoices
      WHERE EXTRACT(YEAR FROM created_at) = $1
    `, [currentYear]),
    // Monthly revenue last 6 months
    query<{ month: string; revenue: string; count: string }>(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', paid_date), 'Mon YY') as month,
        COALESCE(SUM(amount),0) as revenue,
        COUNT(*) as count
      FROM invoices
      WHERE status='paid'
        AND paid_date >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', paid_date)
      ORDER BY DATE_TRUNC('month', paid_date)
    `),
    // Top overdue
    query<{
      id: string;
      invoice_number: string;
      first_name: string;
      last_name: string;
      amount: number;
      due_date: string;
      days_overdue: string;
    }>(`
      SELECT i.id, i.invoice_number, m.first_name, m.last_name,
             i.amount, i.due_date,
             EXTRACT(DAY FROM NOW() - i.due_date)::int as days_overdue
      FROM invoices i JOIN members m ON i.member_id=m.id
      WHERE i.status='overdue'
      ORDER BY i.due_date ASC
      LIMIT 10
    `),
  ]);

  const statCards = [
    {
      title: "Jahresumsatz",
      value: formatCurrency(parseFloat(overview?.total_invoiced || "0")),
      sub: `${overview?.invoices_count || 0} Rechnungen gesamt`,
      icon: Euro,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Eingegangen",
      value: formatCurrency(parseFloat(overview?.total_paid || "0")),
      sub: `${overview?.paid_count || 0} bezahlt`,
      icon: CheckCircle2,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Offen",
      value: formatCurrency(parseFloat(overview?.total_pending || "0")),
      sub: "Noch nicht fällig",
      icon: TrendingUp,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
    },
    {
      title: "Überfällig",
      value: formatCurrency(parseFloat(overview?.total_overdue || "0")),
      sub: "Mahnung erforderlich",
      icon: AlertCircle,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
  ];

  const maxRevenue = Math.max(
    ...monthly.map((m) => parseFloat(m.revenue)),
    1
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Euro className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Buchhaltung</h1>
            <p className="text-muted-foreground text-sm">
              Jahresübersicht {currentYear}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/accounting/invoices">
              <FileText className="w-4 h-4 mr-2" />
              Rechnungen
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      {card.title}
                    </p>
                    <p className="text-2xl font-bold mt-1">{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {card.sub}
                    </p>
                  </div>
                  <div className={`${card.bg} p-2.5 rounded-lg`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Einnahmen (letzte 6 Monate)</CardTitle>
          </CardHeader>
          <CardContent>
            {monthly.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Keine Daten vorhanden
              </p>
            )}
            <div className="space-y-3">
              {monthly.map((m) => (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-14 shrink-0">
                    {m.month}
                  </span>
                  <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full flex items-center justify-end pr-2 transition-all"
                      style={{
                        width: `${Math.max(
                          5,
                          (parseFloat(m.revenue) / maxRevenue) * 100
                        )}%`,
                      }}
                    >
                    </div>
                  </div>
                  <span className="text-xs font-medium w-20 text-right shrink-0">
                    {formatCurrency(parseFloat(m.revenue))}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Generate Monthly Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Monatsbeiträge erzeugen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Erzeugt automatisch Rechnungen für alle aktiven Mitglieder
              basierend auf ihrem Abo-Modell.
            </p>
            <form action={generateMonthlyInvoices} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Jahr</label>
                  <select
                    name="year"
                    defaultValue={currentYear}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {[currentYear - 1, currentYear, currentYear + 1].map(
                      (y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Monat</label>
                  <select
                    name="month"
                    defaultValue={currentMonth}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {[
                      "Januar","Februar","März","April","Mai","Juni",
                      "Juli","August","September","Oktober","November","Dezember",
                    ].map((name, i) => (
                      <option key={i + 1} value={i + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Fälligkeitsdatum</label>
                <input
                  type="date"
                  name="due_date"
                  defaultValue={new Date(currentYear, currentMonth, 15)
                    .toISOString()
                    .slice(0, 10)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <Button type="submit" className="w-full">
                <Zap className="w-4 h-4 mr-2" />
                Rechnungen erzeugen
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Overdue list */}
      {topOverdue.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" />
                Überfällige Rechnungen
              </CardTitle>
              <Link
                href="/accounting/invoices?status=overdue"
                className="text-xs text-primary hover:underline"
              >
                Alle anzeigen
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-6 py-2 font-medium text-muted-foreground text-xs">Nr.</th>
                  <th className="text-left px-6 py-2 font-medium text-muted-foreground text-xs">Mitglied</th>
                  <th className="text-left px-6 py-2 font-medium text-muted-foreground text-xs">Betrag</th>
                  <th className="text-left px-6 py-2 font-medium text-muted-foreground text-xs">Fällig</th>
                  <th className="text-left px-6 py-2 font-medium text-muted-foreground text-xs">Tage</th>
                  <th className="px-6 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {topOverdue.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30">
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                      {inv.invoice_number}
                    </td>
                    <td className="px-6 py-3 font-medium">
                      {inv.first_name} {inv.last_name}
                    </td>
                    <td className="px-6 py-3 font-semibold text-destructive">
                      {formatCurrency(inv.amount)}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {formatDate(inv.due_date)}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="destructive" className="text-xs">
                        {inv.days_overdue} Tage
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href="/accounting/invoices"
                        className="text-xs text-primary hover:underline"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
