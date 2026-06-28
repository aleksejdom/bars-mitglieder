import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Plus, Users, Search } from "lucide-react";
import Link from "next/link";

type Member = {
  id: string;
  member_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
  joined_date: string;
  subscription_type: string;
  plan_name: string | null;
  sports: string | null;
};

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sport?: string }>;
}) {
  await requireAuth();
  const params = await searchParams;
  const q = params.q || "";
  const status = params.status || "";
  const sportFilter = params.sport || "";

  const members = await query<Member>(`
    SELECT
      m.id, m.member_number, m.first_name, m.last_name, m.email, m.phone,
      m.status, m.joined_date, m.subscription_type,
      sp.name as plan_name,
      STRING_AGG(DISTINCT s.name, ', ' ORDER BY s.name) as sports
    FROM members m
    LEFT JOIN subscription_plans sp ON m.plan_id=sp.id
    LEFT JOIN member_sports ms ON m.id=ms.member_id
    LEFT JOIN sports s ON ms.sport_id=s.id
    WHERE
      ($1 = '' OR LOWER(m.first_name || ' ' || m.last_name) LIKE LOWER($1) OR m.member_number LIKE $1 OR LOWER(m.email) LIKE LOWER($1))
      AND ($2 = '' OR m.status=$2)
      AND ($3 = '' OR s.name ILIKE $3)
    GROUP BY m.id, m.member_number, m.first_name, m.last_name, m.email, m.phone,
             m.status, m.joined_date, m.subscription_type, sp.name
    ORDER BY m.last_name, m.first_name
  `, [`%${q}%`, status, sportFilter ? `%${sportFilter}%` : ""],
  );

  const sports = await query<{ name: string }>(`SELECT DISTINCT name FROM sports WHERE active=true ORDER BY name`);

  const statusLabel: Record<string, string> = {
    active: "Aktiv",
    inactive: "Inaktiv",
    suspended: "Gesperrt",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Mitglieder</h1>
            <p className="text-muted-foreground text-sm">{members.length} Einträge</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/members/new">
            <Plus className="w-4 h-4 mr-2" />
            Neues Mitglied
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <form method="GET" className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Name, Nr. oder E-Mail..."
                className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <select
              name="status"
              defaultValue={status}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
              <option value="suspended">Gesperrt</option>
            </select>
            <select
              name="sport"
              defaultValue={sportFilter}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Alle Sportarten</option>
              {sports.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
            <Button type="submit" variant="secondary" size="sm">Filtern</Button>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Mitgliederliste
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Nr.</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Kontakt</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Abo / Sportarten</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Eintritt</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {members.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      Keine Mitglieder gefunden
                    </td>
                  </tr>
                )}
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                      {m.member_number}
                    </td>
                    <td className="px-6 py-3">
                      <Link
                        href={`/members/${m.id}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {m.first_name} {m.last_name}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      <div>{m.email || "—"}</div>
                      {m.phone && <div className="text-xs">{m.phone}</div>}
                    </td>
                    <td className="px-6 py-3">
                      {m.subscription_type === "all_inclusive" ? (
                        <Badge variant="default" className="text-xs">
                          {m.plan_name || "Komplett-Paket"}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {m.sports || "Keine Sportart"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {formatDate(m.joined_date)}
                    </td>
                    <td className="px-6 py-3">
                      <Badge
                        variant={
                          m.status === "active"
                            ? "success"
                            : m.status === "suspended"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {statusLabel[m.status] || m.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
