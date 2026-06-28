import { query, queryOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Users, Euro, TrendingUp, AlertCircle, Trophy, Swords } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  await requireAuth();

  const [stats, recentMembers, overdueInvoices, sportStats] =
    await Promise.all([
      // Overview stats
      queryOne<{
        total_members: string;
        active_members: string;
        monthly_revenue: string;
        pending_amount: string;
        overdue_amount: string;
      }>(`
        SELECT
          (SELECT COUNT(*) FROM members) as total_members,
          (SELECT COUNT(*) FROM members WHERE status='active') as active_members,
          (SELECT COALESCE(SUM(amount),0) FROM invoices WHERE status='paid'
           AND DATE_TRUNC('month', paid_date) = DATE_TRUNC('month', NOW())) as monthly_revenue,
          (SELECT COALESCE(SUM(amount),0) FROM invoices WHERE status='pending') as pending_amount,
          (SELECT COALESCE(SUM(amount),0) FROM invoices WHERE status='overdue') as overdue_amount
      `),
      // Recent members
      query<{
        id: string;
        first_name: string;
        last_name: string;
        status: string;
        joined_date: string;
        subscription_type: string;
      }>(
        `SELECT id, first_name, last_name, status, joined_date, subscription_type
         FROM members ORDER BY created_at DESC LIMIT 5`
      ),
      // Overdue invoices
      query<{
        id: string;
        invoice_number: string;
        member_id: string;
        first_name: string;
        last_name: string;
        amount: number;
        due_date: string;
      }>(`
        SELECT i.id, i.invoice_number, i.member_id, m.first_name, m.last_name,
               i.amount, i.due_date
        FROM invoices i JOIN members m ON i.member_id=m.id
        WHERE i.status='overdue'
        ORDER BY i.due_date ASC LIMIT 5
      `),
      // Members per sport
      query<{ name: string; color: string; count: string }>(`
        SELECT s.name, s.color, COUNT(ms.member_id) as count
        FROM sports s
        LEFT JOIN member_sports ms ON s.id=ms.sport_id
        LEFT JOIN members m ON ms.member_id=m.id AND m.status='active'
        WHERE s.active=true
        GROUP BY s.id, s.name, s.color
        ORDER BY count DESC
      `),
    ]);

  const statCards = [
    {
      title: "Aktive Mitglieder",
      value: stats?.active_members || "0",
      sub: `von ${stats?.total_members || 0} gesamt`,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Einnahmen (Monat)",
      value: formatCurrency(parseFloat(stats?.monthly_revenue || "0")),
      sub: "Bezahlte Beiträge",
      icon: Euro,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Offene Beiträge",
      value: formatCurrency(parseFloat(stats?.pending_amount || "0")),
      sub: "Noch nicht bezahlt",
      icon: TrendingUp,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
    },
    {
      title: "Überfällig",
      value: formatCurrency(parseFloat(stats?.overdue_amount || "0")),
      sub: "Mahnungen erforderlich",
      icon: AlertCircle,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
          <Swords className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Willkommen zurück — Übersicht Ihres Vereins</p>
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
                    <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Members */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Neue Mitglieder</CardTitle>
              <Link
                href="/members"
                className="text-xs text-primary hover:underline"
              >
                Alle anzeigen
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentMembers.length === 0 && (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  Keine Mitglieder vorhanden
                </p>
              )}
              {recentMembers.map((m) => (
                <Link
                  key={m.id}
                  href={`/members/${m.id}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary text-xs font-semibold">
                        {m.first_name.charAt(0)}{m.last_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {m.first_name} {m.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.subscription_type === "all_inclusive"
                          ? "Komplett-Paket"
                          : "Einzelsportarten"}
                        {" · "}
                        Seit {formatDate(m.joined_date)}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={m.status === "active" ? "success" : "secondary"}
                  >
                    {m.status === "active" ? "Aktiv" : "Inaktiv"}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sports Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              Sportarten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sportStats.map((sport) => (
              <div key={sport.name} className="flex items-center gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: sport.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium truncate">{sport.name}</span>
                    <span className="text-muted-foreground shrink-0 ml-2">
                      {sport.count}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (parseInt(sport.count) / Math.max(1, parseInt(stats?.active_members || "1"))) * 100)}%`,
                        backgroundColor: sport.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {sportStats.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Keine Sportarten angelegt
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue */}
      {overdueInvoices.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              Überfällige Rechnungen ({overdueInvoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {overdueInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between px-6 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {inv.first_name} {inv.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inv.invoice_number} · Fällig: {formatDate(inv.due_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-destructive">
                      {formatCurrency(inv.amount)}
                    </span>
                    <Link
                      href="/accounting/invoices"
                      className="text-xs text-primary hover:underline"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
