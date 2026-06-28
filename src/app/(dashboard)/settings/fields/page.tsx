import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createCustomField, deleteCustomField } from "@/lib/actions/fields";
import { Plus, Settings2, Trash2 } from "lucide-react";

type CustomField = {
  id: string;
  name: string;
  label: string;
  field_type: string;
  required: boolean;
  options: string[] | null;
  sort_order: number;
};

const fieldTypeLabel: Record<string, string> = {
  text: "Text",
  number: "Zahl",
  date: "Datum",
  boolean: "Ja/Nein",
  select: "Auswahl",
};

export default async function FieldsPage() {
  await requireAuth();

  const fields = await query<CustomField>(
    "SELECT * FROM custom_fields ORDER BY sort_order, label"
  );

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
          <Settings2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Benutzerdefinierte Felder</h1>
          <p className="text-muted-foreground text-sm">
            Eigene Felder für Mitgliedsdaten anlegen
          </p>
        </div>
      </div>

      {/* Add Field */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Neues Feld anlegen</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCustomField} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Feldname (intern) *</label>
              <input
                name="name"
                required
                placeholder="z.B. shirt_size"
                pattern="[a-z_]+"
                title="Nur Kleinbuchstaben und Unterstriche"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Bezeichnung (Anzeige) *</label>
              <input
                name="label"
                required
                placeholder="z.B. T-Shirt Größe"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Feldtyp</label>
              <select
                name="field_type"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="text">Text</option>
                <option value="number">Zahl</option>
                <option value="date">Datum</option>
                <option value="boolean">Ja/Nein</option>
                <option value="select">Auswahl</option>
              </select>
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium">
                Optionen (nur bei Typ &quot;Auswahl&quot;, kommagetrennt)
              </label>
              <input
                name="options"
                placeholder="XS, S, M, L, XL, XXL"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Pflichtfeld</label>
              <select
                name="required"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="false">Nein</option>
                <option value="true">Ja</option>
              </select>
            </div>
            <div className="col-span-2 sm:col-span-3 pt-1">
              <Button type="submit" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Feld anlegen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Fields List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Vorhandene Felder ({fields.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">
              Noch keine benutzerdefinierten Felder angelegt.
            </p>
          )}
          <div className="divide-y">
            {fields.map((field) => {
              const deleteAction = deleteCustomField.bind(null, field.id);
              return (
                <div key={field.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-8 bg-primary/20 rounded-full" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{field.label}</span>
                        {field.required && (
                          <Badge variant="default" className="text-xs">
                            Pflichtfeld
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs font-mono text-muted-foreground">
                          {field.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {fieldTypeLabel[field.field_type] || field.field_type}
                        </Badge>
                        {field.options && field.options.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {Array.isArray(field.options)
                              ? field.options.join(", ")
                              : JSON.parse(field.options as unknown as string).join(", ")}
                          </span>
                        )}
                      </div>
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
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="py-4 px-6">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Hinweis:</strong> Benutzerdefinierte Felder
            erscheinen in der Mitgliederdetailansicht und können dort befüllt werden.
            Pflichtfelder müssen beim Anlegen eines Mitglieds ausgefüllt werden.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
