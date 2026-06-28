import { requireAuth } from "@/lib/auth";
import { getClubSettings } from "@/lib/club-settings";
import { ClubSettingsForm } from "@/components/club-settings-form";
import { Building2 } from "lucide-react";

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

      <ClubSettingsForm club={club} />
    </div>
  );
}
