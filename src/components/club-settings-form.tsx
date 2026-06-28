"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { saveClubSettings } from "@/lib/actions/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import type { ClubSettings } from "@/lib/club-settings";

export function ClubSettingsForm({ club }: { club: ClubSettings }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await saveClubSettings(formData);
        toast.success("Vereinsdaten gespeichert");
      } catch {
        toast.error("Fehler beim Speichern");
      }
    });
  }

  const inputCls =
    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Allgemeine Angaben</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="club_name">Vereinsname *</Label>
            <Input
              id="club_name" name="club_name" required
              defaultValue={club.club_name} placeholder="BoxClub Berlin e.V."
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="address">Straße & Hausnummer</Label>
            <Input
              id="address" name="address"
              defaultValue={club.address} placeholder="Musterstraße 1"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="postal_code">PLZ</Label>
            <Input
              id="postal_code" name="postal_code"
              defaultValue={club.postal_code} placeholder="10115"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">Stadt</Label>
            <Input
              id="city" name="city"
              defaultValue={club.city} placeholder="Berlin"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone" name="phone"
              defaultValue={club.phone} placeholder="+49 30 123456"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email" name="email" type="email"
              defaultValue={club.email} placeholder="info@boxclub.de"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website" name="website"
              defaultValue={club.website} placeholder="https://www.boxclub.de"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bankverbindung (für Rechnungen)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="iban">IBAN</Label>
            <Input
              id="iban" name="iban"
              defaultValue={club.iban} placeholder="DE89 3704 0044 0532 0130 00"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bic">BIC</Label>
            <Input
              id="bic" name="bic"
              defaultValue={club.bic} placeholder="COBADEFFXXX"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bank_name">Kreditinstitut</Label>
            <Input
              id="bank_name" name="bank_name"
              defaultValue={club.bank_name} placeholder="Commerzbank"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rechtliche Angaben</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="tax_number">Steuernummer</Label>
            <Input
              id="tax_number" name="tax_number"
              defaultValue={club.tax_number} placeholder="27/123/12345"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="register_number">Vereinsregisternummer</Label>
            <Input
              id="register_number" name="register_number"
              defaultValue={club.register_number} placeholder="VR 12345"
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending}>
        <Save className="w-4 h-4 mr-2" />
        {isPending ? "Wird gespeichert…" : "Vereinsdaten speichern"}
      </Button>
    </form>
  );
}
