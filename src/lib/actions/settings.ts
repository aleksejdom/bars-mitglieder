"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function saveClubSettings(formData: FormData) {
  await requireAuth();
  await query(
    `INSERT INTO club_settings (id, club_name, address, postal_code, city, phone, email, website, iban, bic, bank_name, tax_number, register_number, updated_at)
     VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
     ON CONFLICT (id) DO UPDATE SET
       club_name=$1, address=$2, postal_code=$3, city=$4, phone=$5,
       email=$6, website=$7, iban=$8, bic=$9, bank_name=$10,
       tax_number=$11, register_number=$12, updated_at=NOW()`,
    [
      formData.get("club_name") || "",
      formData.get("address") || "",
      formData.get("postal_code") || "",
      formData.get("city") || "",
      formData.get("phone") || "",
      formData.get("email") || "",
      formData.get("website") || "",
      formData.get("iban") || "",
      formData.get("bic") || "",
      formData.get("bank_name") || "",
      formData.get("tax_number") || "",
      formData.get("register_number") || "",
    ]
  );
  revalidatePath("/settings/club");
}
