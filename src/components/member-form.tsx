"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

type Sport = {
  id: string;
  name: string;
  monthly_fee: number;
  color: string;
};

type Plan = {
  id: string;
  name: string;
  monthly_fee: number;
  description: string | null;
};

type Member = {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  joined_date?: string;
  status?: string;
  subscription_type?: string;
  plan_id?: string | null;
  iban?: string;
  bic?: string;
  bank_name?: string;
  notes?: string;
  selected_sports?: string[];
};

export function MemberForm({
  member,
  sports,
  plans,
  action,
}: {
  member?: Member;
  sports: Sport[];
  plans: Plan[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [subscriptionType, setSubscriptionType] = useState(
    member?.subscription_type || "individual"
  );
  const [selectedSports, setSelectedSports] = useState<string[]>(
    member?.selected_sports || []
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    member?.plan_id || plans[0]?.id || ""
  );

  const totalFee =
    subscriptionType === "individual"
      ? sports
          .filter((s) => selectedSports.includes(s.id))
          .reduce((sum, s) => sum + Number(s.monthly_fee), 0)
      : Number(plans.find((p) => p.id === selectedPlanId)?.monthly_fee || 0);

  function toggleSport(id: string) {
    setSelectedSports((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    // Add selected sports as multiple values
    formData.delete("sport_ids");
    selectedSports.forEach((id) => formData.append("sport_ids", id));
    startTransition(async () => {
      await action(formData);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Persönliche Daten</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="first_name">Vorname *</Label>
            <Input
              id="first_name"
              name="first_name"
              required
              defaultValue={member?.first_name}
              placeholder="Max"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last_name">Nachname *</Label>
            <Input
              id="last_name"
              name="last_name"
              required
              defaultValue={member?.last_name}
              placeholder="Mustermann"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={member?.email}
              placeholder="max@beispiel.de"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={member?.phone}
              placeholder="+49 123 456789"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date_of_birth">Geburtsdatum</Label>
            <Input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              defaultValue={member?.date_of_birth?.slice(0, 10)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="joined_date">Eintrittsdatum *</Label>
            <Input
              id="joined_date"
              name="joined_date"
              type="date"
              required
              defaultValue={
                member?.joined_date?.slice(0, 10) ||
                new Date().toISOString().slice(0, 10)
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              name="address"
              defaultValue={member?.address}
              placeholder="Musterstraße 1"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="postal_code">PLZ</Label>
            <Input
              id="postal_code"
              name="postal_code"
              defaultValue={member?.postal_code}
              placeholder="12345"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">Stadt</Label>
            <Input
              id="city"
              name="city"
              defaultValue={member?.city}
              placeholder="Berlin"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={member?.status || "active"}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
              <option value="suspended">Gesperrt</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Subscription / Sports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Abo & Sportarten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Abo-Modell</Label>
            <input type="hidden" name="subscription_type" value={subscriptionType} />
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSubscriptionType("individual")}
                className={`rounded-lg border-2 p-4 text-left transition-all ${
                  subscriptionType === "individual"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <p className="font-medium text-sm">Einzelsportarten</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sportarten einzeln wählen
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubscriptionType("all_inclusive");
                  if (!selectedPlanId && plans[0]) setSelectedPlanId(plans[0].id);
                }}
                className={`rounded-lg border-2 p-4 text-left transition-all ${
                  subscriptionType === "all_inclusive"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <p className="font-medium text-sm">Komplett-Paket</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Alle Sportarten inklusive
                </p>
              </button>
            </div>
          </div>

          {subscriptionType === "individual" && (
            <div className="space-y-2">
              <Label>Sportarten auswählen</Label>
              <div className="grid grid-cols-2 gap-2">
                {sports.map((sport) => {
                  const selected = selectedSports.includes(sport.id);
                  return (
                    <button
                      key={sport.id}
                      type="button"
                      onClick={() => toggleSport(sport.id)}
                      className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: sport.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{sport.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {Number(sport.monthly_fee).toFixed(2)} €/Monat
                        </p>
                      </div>
                      {selected && (
                        <Check className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
              {sports.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Keine Sportarten vorhanden. Bitte unter Einstellungen anlegen.
                </p>
              )}
            </div>
          )}

          {subscriptionType === "all_inclusive" && (
            <div className="space-y-2">
              <Label htmlFor="plan_id">Komplett-Paket</Label>
              <select
                id="plan_id"
                name="plan_id"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Paket auswählen...</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {Number(p.monthly_fee).toFixed(2)} €/Monat
                  </option>
                ))}
              </select>
            </div>
          )}

          {(selectedSports.length > 0 || subscriptionType === "all_inclusive") && (
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
              <span className="text-sm font-medium">Monatlicher Beitrag</span>
              <span className="text-lg font-bold text-primary">
                {totalFee.toFixed(2)} €
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bank Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bankdaten (SEPA)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="iban">IBAN</Label>
            <Input
              id="iban"
              name="iban"
              defaultValue={member?.iban}
              placeholder="DE89 3704 0044 0532 0130 00"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bic">BIC</Label>
            <Input
              id="bic"
              name="bic"
              defaultValue={member?.bic}
              placeholder="COBADEFFXXX"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bank_name">Bank</Label>
            <Input
              id="bank_name"
              name="bank_name"
              defaultValue={member?.bank_name}
              placeholder="Commerzbank"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notizen</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            name="notes"
            defaultValue={member?.notes}
            placeholder="Interne Notizen zum Mitglied..."
            rows={3}
          />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Wird gespeichert..." : member?.id ? "Speichern" : "Mitglied anlegen"}
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
