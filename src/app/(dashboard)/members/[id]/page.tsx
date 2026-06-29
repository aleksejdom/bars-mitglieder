import { query, queryOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { updateMember, deleteMember, pauseSubscription, resumeSubscription, revokeCancellation } from "@/lib/actions/members";
import { MemberForm } from "@/components/member-form";
import { CancelMemberDialog } from "@/components/cancel-member-dialog";
import { MemberPhoto } from "@/components/member-photo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, FileText, Trash2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type Member = {
  id: string;
  member_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  address: string;
  city: string;
  postal_code: string;
  joined_date: string;
  status: string;
  subscription_type: string;
  plan_id: string | null;
  cancellation_date: string | null;
  billing_period: string;
  auto_invoice_enabled: boolean;
  subscription_paused: boolean;
  photo_url: string | null;
  iban: string;
  bic: string;
  bank_name: string;
  notes: string;
};

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;

  const [member, sports, plans, memberSports, invoices, customFields, fieldValues] = await Promise.all([
    queryOne<Member>("SELECT * FROM members WHERE id=$1", [id]),
    query<{ id: string; name: string; monthly_fee: number; color: string }>(
      "SELECT id, name, monthly_fee, color FROM sports WHERE active=true ORDER BY sort_order"
    ),
    query<{ id: string; name: string; monthly_fee: number; description: string | null }>(
      "SELECT id, name, monthly_fee, description FROM subscription_plans WHERE active=true ORDER BY monthly_fee"
    ),
    query<{ sport_id: string }>(
      "SELECT sport_id FROM member_sports WHERE member_id=$1",
      [id]
    ),
    query<{
      id: string;
      invoice_number: string;
      type: string;
      amount: number;
      status: string;
      due_date: string;
      created_at: string;
    }>(
      "SELECT id, invoice_number, type, amount, status, due_date, created_at FROM invoices WHERE member_id=$1 ORDER BY created_at DESC LIMIT 10",
      [id]
    ),
    query<{ id: string; name: string; label: string; field_type: string; required: boolean; options: string[] | null }>(
      "SELECT id, name, label, field_type, required, options FROM custom_fields ORDER BY sort_order, label"
    ),
    query<{ field_id: string; value: string | null }>(
      "SELECT field_id, value FROM member_field_values WHERE member_id=$1",
      [id]
    ),
  ]);

  if (!member) notFound();

  const selectedSports = memberSports.map((ms) => ms.sport_id);

  const updateAction = updateMember.bind(null, id);
  const deleteAction = deleteMember.bind(null, id);
  const pauseAction = pauseSubscription.bind(null, id);
  const resumeAction = resumeSubscription.bind(null, id);
  const revokeAction = revokeCancellation.bind(null, id);

  const typeLabel: Record<string, string> = {
    invoice: "Rechnung",
    reminder: "Mahnung",
    final_reminder: "Letzte Mahnung",
  };

  const statusLabel: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
    pending: { label: "Offen", variant: "warning" },
    paid: { label: "Bezahlt", variant: "success" },
    overdue: { label: "Überfällig", variant: "destructive" },
    cancelled: { label: "Storniert", variant: "secondary" },
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* Left: back + identity */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild className="mt-1 shrink-0">
            <Link href="/members">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <MemberPhoto
              memberId={member.id}
              hasPhoto={!!member.photo_url}
              name={`${member.first_name} ${member.last_name}`}
            />
            <div className="space-y-1">
              <h1 className="text-2xl font-bold leading-tight">
                {member.first_name} {member.last_name}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-muted-foreground text-sm font-mono bg-muted px-2 py-0.5 rounded">
                  {member.member_number}
                </span>
                {member.status === "cancelled" && (
                  <Badge variant="outline" className="text-xs border-orange-300 text-orange-600 bg-orange-50">
                    Gekündigt
                    {member.cancellation_date && (
                      <> zum {formatDate(member.cancellation_date)}</>
                    )}
                  </Badge>
                )}
                {member.status === "active" && (
                  <Badge variant="outline" className="text-xs border-green-300 text-green-700 bg-green-50">
                    Aktiv
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 flex-wrap sm:shrink-0 pl-12 sm:pl-0">
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/members/${member.id}/contract`} target="_blank" rel="noopener noreferrer">
              <FileText className="w-4 h-4 mr-2" />
              Vertrag
            </a>
          </Button>

          {member.status === "cancelled" ? (
            <>
              <form action={revokeAction}>
                <Button type="submit" variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-50">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Widerruf
                </Button>
              </form>
              <CancelMemberDialog
                memberId={member.id}
                memberName={`${member.first_name} ${member.last_name}`}
                memberNumber={member.member_number}
                currentStatus={member.status}
                cancellationDate={member.cancellation_date}
              />
            </>
          ) : (
            <CancelMemberDialog
              memberId={member.id}
              memberName={`${member.first_name} ${member.last_name}`}
              memberNumber={member.member_number}
              currentStatus={member.status}
              cancellationDate={member.cancellation_date}
            />
          )}

          <div className="w-px h-6 bg-border mx-1" />

          <form action={deleteAction}>
            <Button type="submit" variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
              <Trash2 className="w-4 h-4 mr-2" />
              Löschen
            </Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2">
          <MemberForm
            member={{ ...member, selected_sports: selectedSports }}
            sports={sports}
            plans={plans}
            action={updateAction}
            customFields={customFields}
            fieldValues={fieldValues}
            pauseAction={pauseAction}
            resumeAction={resumeAction}
          />
        </div>

        {/* Right sidebar: invoices */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Rechnungen
                </CardTitle>
                <Link
                  href={`/accounting/invoices?member=${id}`}
                  className="text-xs text-primary hover:underline"
                >
                  Alle
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {invoices.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6 px-4">
                  Keine Rechnungen vorhanden
                </p>
              )}
              <div className="divide-y">
                {invoices.map((inv) => {
                  const s = statusLabel[inv.status] || { label: inv.status, variant: "secondary" as const };
                  return (
                    <div key={inv.id} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-mono text-muted-foreground">
                            {inv.invoice_number}
                          </p>
                          <p className="text-sm font-medium">
                            {formatCurrency(inv.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {typeLabel[inv.type] || inv.type}
                          </p>
                        </div>
                        <Badge variant={s.variant} className="text-xs">
                          {s.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
