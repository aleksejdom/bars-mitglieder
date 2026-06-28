"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function createCustomField(formData: FormData) {
  await requireAuth();
  const optionsRaw = formData.get("options") as string;
  let options = null;
  if (optionsRaw) {
    try {
      options = JSON.stringify(
        optionsRaw.split(",").map((o) => o.trim()).filter(Boolean)
      );
    } catch {
      options = null;
    }
  }
  await query(
    `INSERT INTO custom_fields (name, label, field_type, required, options, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      formData.get("name"),
      formData.get("label"),
      formData.get("field_type") || "text",
      formData.get("required") === "true",
      options,
      parseInt(formData.get("sort_order") as string) || 0,
    ]
  );
  revalidatePath("/settings/fields");
}

export async function deleteCustomField(id: string) {
  await requireAuth();
  await query("DELETE FROM custom_fields WHERE id = $1", [id]);
  revalidatePath("/settings/fields");
}

export async function updateCustomFieldValue(
  memberId: string,
  fieldId: string,
  value: string
) {
  await requireAuth();
  await query(
    `INSERT INTO member_field_values (member_id, field_id, value)
     VALUES ($1,$2,$3)
     ON CONFLICT (member_id, field_id) DO UPDATE SET value=$3`,
    [memberId, fieldId, value]
  );
  revalidatePath(`/members/${memberId}`);
}
