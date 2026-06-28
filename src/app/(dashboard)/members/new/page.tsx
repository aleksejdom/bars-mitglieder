import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createMember } from "@/lib/actions/members";
import { MemberForm } from "@/components/member-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";

export default async function NewMemberPage() {
  await requireAuth();

  const [sports, plans] = await Promise.all([
    query<{ id: string; name: string; monthly_fee: number; color: string }>(
      "SELECT id, name, monthly_fee, color FROM sports WHERE active=true ORDER BY sort_order"
    ),
    query<{ id: string; name: string; monthly_fee: number; description: string | null }>(
      "SELECT id, name, monthly_fee, description FROM subscription_plans WHERE active=true ORDER BY monthly_fee"
    ),
  ]);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/members">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <UserPlus className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Neues Mitglied</h1>
            <p className="text-muted-foreground text-sm">Mitgliedsdaten erfassen</p>
          </div>
        </div>
      </div>

      <MemberForm sports={sports} plans={plans} action={createMember} />
    </div>
  );
}
