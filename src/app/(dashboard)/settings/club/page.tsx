import { requireAuth } from "@/lib/auth";
import { getClubSettings } from "@/lib/club-settings";
import { saveClubSettings } from "@/lib/actions/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Save } from "lucide-react";

export default async function ClubSettingsPage() {
  await requireAuth();
  const club = await getClubSettings();

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Vereinsdaten</h1>
          <p className="text-muted-foreground text-sm">
            Erscheinen im Kopf aller PDFs (Rechnungen, Verträge, Kündigungsschreiben)
          </p>
        </div>
      </div>

      <form action={saveClubSettings} className="space-y-6">
        {/* General */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Allgemeine Angaben</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="club_name">Vereinsname *</Label>
              <Input
                id="club_name"
                name="club_name"
                required
                defaultValue={club.club_name}
                placeholder="BoxClub Berlin e.V."
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">Straße & Hausnummer</Label>
              <Input
                id="address"
                name="address"
                defaultValue={club.address}
                placeholder="Musterstraße 1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="postal_code">PLZ</Label>
              <Input
                id="postal_code"
                name="postal_code"
                defaultValue={club.postal_code}
                placeholder="10115"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">Stadt</Label>
              <Input
                id="city"
                name="city"
                defaultValue={club.city}
                placeholder="Berlin"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={club.phone}
                placeholder="+49 30 123456"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={club.email}
                placeholder="info@boxclub.de"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                defaultValue={club.website}
                placeholder="https://www.boxclub.de"
              />
            </div>
          </CardContent>
        </Card>

        {/* Banking */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bankverbindung (für Rechnungen)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                name="iban"
                defaultValue={club.iban}
                placeholder="DE89 3704 0044 0532 0130 00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bic">BIC</Label>
              <Input
                id="bic"
                name="bic"
                defaultValue={club.bic}
                placeholder="COBADEFFXXX"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bank_name">Kreditinstitut</Label>
              <Input
                id="bank_name"
                name="bank_name"
                defaultValue={club.bank_name}
                placeholder="Commerzbank"
              />
            </div>
          </CardContent>
        </Card>

        {/* Legal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rechtliche Angaben</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tax_number">Steuernummer</Label>
              <Input
                id="tax_number"
                name="tax_number"
                defaultValue={club.tax_number}
                placeholder="27/123/12345"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="register_number">Vereinsregisternummer</Label>
              <Input
                id="register_number"
                name="register_number"
                defaultValue={club.register_number}
                placeholder="VR 12345"
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit">
          <Save className="w-4 h-4 mr-2" />
          Vereinsdaten speichern
        </Button>
      </form>
    </div>
  );
}
