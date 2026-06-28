"use client";

import { useState, useTransition } from "react";
import { updatePlan, deletePlan } from "@/lib/actions/sports";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Pencil, Trash2, X, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  monthly_fee: number;
  yearly_fee: number | null;
  active: boolean;
  member_count: string;
};

const inputCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

export function PlanEditCard({ plan }: { plan: Plan }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const updateAction = updatePlan.bind(null, plan.id);
  const deleteAction = deletePlan.bind(null, plan.id);

  if (editing) {
    return (
      <Card className="border-primary/40">
        <CardContent className="p-4">
          <form
            action={(fd) =>
              startTransition(async () => {
                await updateAction(fd);
                setEditing(false);
              })
            }
            className="space-y-3"
          >
            <div className="space-y-1">
              <label className="text-xs font-medium">Name *</label>
              <input name="name" required defaultValue={plan.name} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Beschreibung</label>
              <input name="description" defaultValue={plan.description ?? ""} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Monatsbeitrag (€) *</label>
                <input
                  type="number" name="monthly_fee" required min="0" step="0.50"
                  defaultValue={plan.monthly_fee} className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  Jahresbeitrag (€){" "}
                  <span className="text-muted-foreground font-normal">
                    (leer = {formatCurrency(plan.monthly_fee * 12)})
                  </span>
                </label>
                <input
                  type="number" name="yearly_fee" min="0" step="0.50"
                  defaultValue={plan.yearly_fee ?? ""} className={inputCls}
                  placeholder={(plan.monthly_fee * 12).toFixed(2)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Aktiv</label>
              <select name="active" defaultValue={plan.active ? "true" : "false"} className={inputCls}>
                <option value="true">Ja</option>
                <option value="false">Nein</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Speichern…" : "Speichern"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                <X className="w-4 h-4 mr-1" />
                Abbrechen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-sm transition-shadow border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <p className="font-medium">{plan.name}</p>
              {!plan.active && (
                <Badge variant="secondary" className="text-xs">Inaktiv</Badge>
              )}
            </div>
            {plan.description && (
              <p className="text-xs text-muted-foreground mt-0.5 ml-6">{plan.description}</p>
            )}
            <div className="flex items-center gap-3 mt-1 ml-6">
              <span className="text-sm font-semibold text-primary">
                {formatCurrency(plan.monthly_fee)}/Monat
              </span>
              {plan.yearly_fee != null && (
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(plan.yearly_fee)}/Jahr
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                {plan.member_count} Mitglieder
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="p-1.5 rounded hover:bg-muted transition-colors"
              title="Bearbeiten"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <form action={deleteAction}>
              <button
                type="submit"
                className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
