"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, PauseCircle, PlayCircle } from "lucide-react";
import { CustomFieldsCard } from "@/components/custom-fields-card";

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
  billing_period?: string;
  auto_invoice_enabled?: boolean;
  subscription_paused?: boolean;
};

type CustomField = {
  id: string;
  name: string;
  label: string;
  field_type: string;
  required: boolean;
  options: string[] | null;
};

export function MemberForm({
  member,
  sports,
  plans,
  action,
  customFields,
  fieldValues,
  pauseAction,
  resumeAction,
}: {
  member?: Member;
  sports: Sport[];
  plans: Plan[];
  action: (formData: FormData) => Promise<void>;
  customFields?: CustomField[];
  fieldValues?: { field_id: string; value: string | null }[];
  pauseAction?: () => Promise<void>;
  resumeAction?: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [isPausePending, startPauseTransition] = useTransition();
  const [subscriptionType, setSubscriptionType] = useState(
    member?.subscription_type || "individual"
  );
  const [selectedSports, setSelectedSports] = useState<string[]>(
    member?.selected_sports || []
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    member?.plan_id || plans[0]?.id || ""
  );
  const [billingPeriod, setBillingPeriod] = useState(
    member?.billing_period || "monthly"
  );
  const [autoInvoice, setAutoInvoice] = useState(
    member?.auto_invoice_enabled !== false
  );
  const [isPaused, setIsPaused] = useState(
    member?.subscription_paused ?? false
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
          <CardTitle className="text-base flex items-center gap-2">
            Abo & Sportarten
            {isPaused && (
              <span className="text-xs font-normal text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Pausiert
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Abo-Modell */}
          <div className={`space-y-1.5 ${isPaused ? "opacity-40 pointer-events-none select-none" : ""}`}>
            <Label>Abo-Modell</Label>
            <input type="hidden" name="subscription_type" value={subscriptionType} />
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSubscriptionType("individual")}
                disabled={isPaused}
                className={`rounded-lg border-2 p-4 text-left transition-all ${
                  subscriptionType === "individual"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <p className="font-medium text-sm">Einzelsportarten</p>
                <p className="text-xs text-muted-foreground mt-0.5">Sportarten einzeln wählen</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubscriptionType("all_inclusive");
                  if (!selectedPlanId && plans[0]) setSelectedPlanId(plans[0].id);
                }}
                disabled={isPaused}
                className={`rounded-lg border-2 p-4 text-left transition-all ${
                  subscriptionType === "all_inclusive"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <p className="font-medium text-sm">Komplett-Paket</p>
                <p className="text-xs text-muted-foreground mt-0.5">Alle Sportarten inklusive</p>
              </button>
            </div>
          </div>

          {/* Zahlungsweise */}
          <div className={`space-y-1.5 ${isPaused ? "opacity-40 pointer-events-none select-none" : ""}`}>
            <Label>Zahlungsweise</Label>
            <input type="hidden" name="billing_period" value={billingPeriod} />
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBillingPeriod("monthly")}
                disabled={isPaused}
                className={`rounded-lg border-2 p-4 text-left transition-all ${
                  billingPeriod === "monthly"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <p className="font-medium text-sm">Monatsbeitrag</p>
                <p className="text-xs text-muted-foreground mt-0.5">Monatliche Zahlung</p>
              </button>
              <button
                type="button"
                onClick={() => setBillingPeriod("yearly")}
                disabled={isPaused}
                className={`rounded-lg border-2 p-4 text-left transition-all ${
                  billingPeriod === "yearly"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <p className="font-medium text-sm">Jahresbeitrag</p>
                <p className="text-xs text-muted-foreground mt-0.5">Jährliche Zahlung</p>
              </button>
            </div>
          </div>

          {/* Sportarten */}
          {subscriptionType === "individual" && (
            <div className={`space-y-2 ${isPaused ? "opacity-40 pointer-events-none select-none" : ""}`}>
              <Label>Sportarten auswählen</Label>
              <div className="grid grid-cols-2 gap-2">
                {sports.map((sport) => {
                  const selected = selectedSports.includes(sport.id);
                  return (
                    <button
                      key={sport.id}
                      type="button"
                      onClick={() => toggleSport(sport.id)}
                      disabled={isPaused}
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
                      {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
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

          {/* Komplett-Paket select */}
          {subscriptionType === "all_inclusive" && (
            <div className={`space-y-2 ${isPaused ? "opacity-40 pointer-events-none select-none" : ""}`}>
              <Label htmlFor="plan_id">Komplett-Paket</Label>
              <select
                id="plan_id"
                name="plan_id"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                disabled={isPaused}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40"
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

          {/* Beitrag summary */}
          {(selectedSports.length > 0 || subscriptionType === "all_inclusive") && (
            <div className={`flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 ${isPaused ? "opacity-40" : ""}`}>
              <span className="text-sm font-medium">
                {billingPeriod === "yearly" ? "Jährlicher Beitrag" : "Monatlicher Beitrag"}
              </span>
              <span className="text-lg font-bold text-primary">
                {billingPeriod === "yearly"
                  ? (totalFee * 12).toFixed(2)
                  : totalFee.toFixed(2)}{" "}
                €
              </span>
            </div>
          )}

          {/* Auto-invoice toggle */}
          <input type="hidden" name="auto_invoice_enabled" value={autoInvoice && !isPaused ? "true" : "false"} />
          <div
            className={`flex items-center justify-between rounded-lg border border-border px-4 py-3 transition-opacity ${
              isPaused ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
            }`}
            onClick={() => !isPaused && setAutoInvoice((v) => !v)}
          >
            <div>
              <p className="text-sm font-medium">Automatische Rechnungserstellung</p>
              <p className="text-xs text-muted-foreground">
                {isPaused
                  ? "Deaktiviert — Abo ist pausiert"
                  : `Rechnung wird automatisch ${billingPeriod === "yearly" ? "jährlich" : "monatlich"} erstellt`}
              </p>
            </div>
            <div
              className={`w-10 h-6 rounded-full transition-colors flex items-center ${
                autoInvoice && !isPaused ? "bg-primary" : "bg-muted"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white mx-1 transition-transform ${
                  autoInvoice && !isPaused ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </div>
          </div>

          {/* Abo pause / resume */}
          {member?.id && (pauseAction || resumeAction) && (
            <div
              className={`rounded-lg border px-4 py-3 flex items-center justify-between gap-4 ${
                isPaused
                  ? "border-amber-300 bg-amber-50"
                  : "border-destructive/30 bg-destructive/5"
              }`}
            >
              <div>
                <p className="text-sm font-medium">
                  {isPaused ? "Abo ist pausiert" : "Abo pausieren"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPaused
                    ? "Keine Rechnungen bis das Abo fortgesetzt wird"
                    : "Stoppt alle zukünftigen Abbuchungen und Rechnungen"}
                </p>
              </div>
              {isPaused ? (
                resumeAction && (
                  <button
                    type="button"
                    disabled={isPausePending}
                    onClick={() =>
                      startPauseTransition(async () => {
                        await resumeAction();
                        setIsPaused(false);
                        setAutoInvoice(true);
                        toast.success("Abo wurde fortgesetzt", {
                          description: "Automatische Rechnungserstellung ist wieder aktiv.",
                        });
                      })
                    }
                    className="flex items-center gap-1.5 text-sm font-medium text-green-700 border border-green-500 rounded-md px-3 py-1.5 hover:bg-green-100 transition-colors whitespace-nowrap disabled:opacity-50"
                  >
                    <PlayCircle className="w-4 h-4" />
                    {isPausePending ? "..." : "Abo fortsetzen"}
                  </button>
                )
              ) : (
                pauseAction && (
                  <button
                    type="button"
                    disabled={isPausePending}
                    onClick={() =>
                      startPauseTransition(async () => {
                        await pauseAction();
                        setIsPaused(true);
                        setAutoInvoice(false);
                        toast.warning("Abo wurde gestoppt", {
                          description: "Alle zukünftigen Rechnungen sind pausiert.",
                        });
                      })
                    }
                    className="flex items-center gap-1.5 text-sm font-medium text-destructive border border-destructive/50 rounded-md px-3 py-1.5 hover:bg-destructive/10 transition-colors whitespace-nowrap disabled:opacity-50"
                  >
                    <PauseCircle className="w-4 h-4" />
                    {isPausePending ? "..." : "Abo stoppen"}
                  </button>
                )
              )}
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

      {member?.id && customFields && customFields.length > 0 && (
        <CustomFieldsCard
          memberId={member.id}
          fields={customFields}
          values={fieldValues ?? []}
        />
      )}

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
