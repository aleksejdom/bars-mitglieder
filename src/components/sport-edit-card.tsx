"use client";

import { useState, useTransition } from "react";
import { updateSport, deleteSport } from "@/lib/actions/sports";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, X, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

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

const inputCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

export function SportEditCard({ sport }: { sport: Sport }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const updateAction = updateSport.bind(null, sport.id);
  const deleteAction = deleteSport.bind(null, sport.id);

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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Name *</label>
                <input name="name" required defaultValue={sport.name} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Beschreibung</label>
                <input name="description" defaultValue={sport.description ?? ""} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Monatsbeitrag (€) *</label>
                <input
                  type="number" name="monthly_fee" required min="0" step="0.50"
                  defaultValue={sport.monthly_fee} className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  Jahresbeitrag (€){" "}
                  <span className="text-muted-foreground font-normal">
                    (leer = {formatCurrency(sport.monthly_fee * 12)})
                  </span>
                </label>
                <input
                  type="number" name="yearly_fee" min="0" step="0.50"
                  defaultValue={sport.yearly_fee ?? ""} className={inputCls}
                  placeholder={(sport.monthly_fee * 12).toFixed(2)}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Farbe</label>
                <input type="color" name="color" defaultValue={sport.color}
                  className="h-9 w-full rounded-md border border-input cursor-pointer" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Reihenfolge</label>
                <input type="number" name="sort_order" min="0"
                  defaultValue={sport.sort_order} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Aktiv</label>
                <select name="active" defaultValue={sport.active ? "true" : "false"} className={inputCls}>
                  <option value="true">Ja</option>
                  <option value="false">Nein</option>
                </select>
              </div>
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
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-4 h-10 rounded-full shrink-0" style={{ backgroundColor: sport.color }} />
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{sport.name}</p>
                {!sport.active && (
                  <Badge variant="secondary" className="text-xs">Inaktiv</Badge>
                )}
              </div>
              {sport.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{sport.description}</p>
              )}
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm font-semibold text-primary">
                  {formatCurrency(sport.monthly_fee)}/Monat
                </span>
                {sport.yearly_fee != null && (
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(sport.yearly_fee)}/Jahr
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  {sport.member_count} Mitglieder
                </span>
              </div>
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
                title="Löschen"
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
