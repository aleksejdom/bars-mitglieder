"use client";

import { useState, useTransition } from "react";
import { cancelMember } from "@/lib/actions/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { XCircle, FileDown, AlertTriangle } from "lucide-react";

export function CancelMemberDialog({
  memberId,
  memberName,
  memberNumber,
  currentStatus,
  cancellationDate,
}: {
  memberId: string;
  memberName: string;
  memberNumber: string;
  currentStatus: string;
  cancellationDate?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(
    cancellationDate?.slice(0, 10) ||
    new Date(new Date().setMonth(new Date().getMonth() + 1))
      .toISOString()
      .slice(0, 10)
  );

  const isCancelled = currentStatus === "cancelled";

  function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("cancellation_date", date);
    startTransition(async () => {
      await cancelMember(memberId, formData);
      setOpen(false);
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={isCancelled ? "border-orange-300 text-orange-600 hover:bg-orange-50" : "border-orange-300 text-orange-600 hover:bg-orange-50"}
      >
        <XCircle className="w-4 h-4 mr-2" />
        {isCancelled ? "Kündigung bearbeiten" : "Kündigen"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Mitgliedschaft kündigen
            </DialogTitle>
            <DialogDescription>
              <strong>{memberName}</strong> ({memberNumber}) — Wählen Sie das Kündigungsdatum.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCancel} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cancellation_date">Kündigung zum</Label>
              <Input
                id="cancellation_date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Der Mitgliedsstatus wird auf &quot;Gekündigt&quot; gesetzt. Das Mitglied
                hat bis zu diesem Datum Zugang zu allen Leistungen.
              </p>
            </div>

            <div className="rounded-md bg-orange-50 border border-orange-200 px-4 py-3 text-sm text-orange-800">
              Nach der Kündigung können Sie das automatische Kündigungsschreiben
              als PDF herunterladen.
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isPending ? "Wird gespeichert..." : "Kündigung bestätigen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isCancelled && (
        <Button variant="outline" size="sm" asChild>
          <a
            href={`/api/members/${memberId}/cancellation-pdf`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Kündigungsschreiben
          </a>
        </Button>
      )}
    </>
  );
}
