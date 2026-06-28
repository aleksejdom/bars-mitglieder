import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createSport, updateSport, deleteSport, createPlan, deletePlan } from "@/lib/actions/sports";
import { formatCurrency } from "@/lib/utils";
import { Plus, Dumbbell, Package, Trash2, Users } from "lucide-react";

type Sport = {
  id: string;
  name: string;
  description: string | null;
  monthly_fee: number;
  color: string;
  active: boolean;
  sort_order: number;
  member_count: string;
};

type Plan = {
  id: string;
  name: string;
  description: string | null;
  monthly_fee: number;
  active: boolean;
  member_count: string;
};

export default async function SportsPage() {
  await requireAuth();

  const [sports, plans] = await Promise.all([
    query<Sport>(`
      SELECT s.*, COUNT(ms.member_id) as member_count
      FROM sports s
      LEFT JOIN member_sports ms ON s.id=ms.sport_id
      LEFT JOIN members m ON ms.member_id=m.id AND m.status='active'
      GROUP BY s.id
      ORDER BY s.sort_order, s.name
    `),
    query<Plan>(`
      SELECT sp.*, COUNT(m.id) as member_count
      FROM subscription_plans sp
      LEFT JOIN members m ON m.plan_id=sp.id AND m.status='active'
      GROUP BY sp.id
      ORDER BY sp.monthly_fee
    `),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
          <Dumbbell className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Sportarten & Pakete</h1>
          <p className="text-muted-foreground text-sm">
            Sportarten und Abo-Modelle verwalten
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sports */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Dumbbell className="w-4 h-4" />
                Neue Sportart
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createSport} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Name *</label>
                    <input
                      name="name"
                      required
                      placeholder="z.B. Boxen"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Monatsbeitrag (€) *</label>
                    <input
                      type="number"
                      name="monthly_fee"
                      required
                      min="0"
                      step="0.50"
                      placeholder="45.00"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Beschreibung</label>
                  <input
                    name="description"
                    placeholder="Kurzbeschreibung..."
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Farbe</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        name="color"
                        defaultValue="#dc2626"
                        className="h-9 w-12 rounded-md border border-input cursor-pointer"
                      />
                      <span className="text-xs text-muted-foreground">Kennfarbe</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Reihenfolge</label>
                    <input
                      type="number"
                      name="sort_order"
                      defaultValue="0"
                      min="0"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
                <Button type="submit" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Sportart anlegen
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Sports List */}
          <div className="space-y-2">
            {sports.map((sport) => {
              const deleteAction = deleteSport.bind(null, sport.id);
              return (
                <Card key={sport.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-10 rounded-full shrink-0"
                          style={{ backgroundColor: sport.color }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{sport.name}</p>
                            {!sport.active && (
                              <Badge variant="secondary" className="text-xs">
                                Inaktiv
                              </Badge>
                            )}
                          </div>
                          {sport.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {sport.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm font-semibold text-primary">
                              {formatCurrency(sport.monthly_fee)}/Monat
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="w-3 h-3" />
                              {sport.member_count} Mitglieder
                            </span>
                          </div>
                        </div>
                      </div>
                      <form action={deleteAction}>
                        <button
                          type="submit"
                          className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                          title="Löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {sports.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Keine Sportarten angelegt
              </p>
            )}
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                Neues Komplett-Paket
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createPlan} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Name *</label>
                  <input
                    name="name"
                    required
                    placeholder="z.B. Komplett-Paket"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Beschreibung</label>
                  <input
                    name="description"
                    placeholder="Alle Sportarten inklusive..."
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Monatsbeitrag (€) *</label>
                  <input
                    type="number"
                    name="monthly_fee"
                    required
                    min="0"
                    step="0.50"
                    placeholder="89.00"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <Button type="submit" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Paket anlegen
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Plans List */}
          <div className="space-y-2">
            {plans.map((plan) => {
              const deleteAction = deletePlan.bind(null, plan.id);
              return (
                <Card key={plan.id} className="hover:shadow-sm transition-shadow border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-primary" />
                          <p className="font-medium">{plan.name}</p>
                          {!plan.active && (
                            <Badge variant="secondary" className="text-xs">
                              Inaktiv
                            </Badge>
                          )}
                        </div>
                        {plan.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                            {plan.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1 ml-6">
                          <span className="text-sm font-semibold text-primary">
                            {formatCurrency(plan.monthly_fee)}/Monat
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" />
                            {plan.member_count} Mitglieder
                          </span>
                        </div>
                      </div>
                      <form action={deleteAction}>
                        <button
                          type="submit"
                          className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {plans.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Keine Pakete angelegt
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
