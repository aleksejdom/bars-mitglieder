import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createSport, createPlan } from "@/lib/actions/sports";
import { SportEditCard } from "@/components/sport-edit-card";
import { PlanEditCard } from "@/components/plan-edit-card";
import { Plus, Dumbbell, Package } from "lucide-react";

type Sport = {
  id: string;
  name: string;
  description: string | null;
  monthly_fee: number;
  yearly_fee: number | null;
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
  yearly_fee: number | null;
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

  const inputCls =
    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

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
                    <input name="name" required placeholder="z.B. Boxen" className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Beschreibung</label>
                    <input name="description" placeholder="Kurzbeschreibung…" className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Monatsbeitrag (€) *</label>
                    <input
                      type="number" name="monthly_fee" required min="0" step="0.50"
                      placeholder="45.00" className={inputCls}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Jahresbeitrag (€)</label>
                    <input
                      type="number" name="yearly_fee" min="0" step="0.50"
                      placeholder="490.00 (optional)" className={inputCls}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Farbe</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color" name="color" defaultValue="#dc2626"
                        className="h-9 w-12 rounded-md border border-input cursor-pointer"
                      />
                      <span className="text-xs text-muted-foreground">Kennfarbe</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Reihenfolge</label>
                    <input type="number" name="sort_order" defaultValue="0" min="0" className={inputCls} />
                  </div>
                </div>
                <Button type="submit" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Sportart anlegen
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {sports.map((sport) => (
              <SportEditCard key={sport.id} sport={sport} />
            ))}
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
                  <input name="name" required placeholder="z.B. Komplett-Paket" className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Beschreibung</label>
                  <input name="description" placeholder="Alle Sportarten inklusive…" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Monatsbeitrag (€) *</label>
                    <input
                      type="number" name="monthly_fee" required min="0" step="0.50"
                      placeholder="89.00" className={inputCls}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Jahresbeitrag (€)</label>
                    <input
                      type="number" name="yearly_fee" min="0" step="0.50"
                      placeholder="950.00 (optional)" className={inputCls}
                    />
                  </div>
                </div>
                <Button type="submit" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Paket anlegen
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {plans.map((plan) => (
              <PlanEditCard key={plan.id} plan={plan} />
            ))}
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
