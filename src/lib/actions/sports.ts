"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function createSport(formData: FormData) {
  await requireAuth();
  const yearlyFeeStr = formData.get("yearly_fee") as string;
  await query(
    `INSERT INTO sports (name, description, monthly_fee, yearly_fee, color, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      formData.get("name"),
      formData.get("description") || null,
      parseFloat(formData.get("monthly_fee") as string) || 0,
      yearlyFeeStr ? parseFloat(yearlyFeeStr) : null,
      formData.get("color") || "#dc2626",
      parseInt(formData.get("sort_order") as string) || 0,
    ]
  );
  revalidatePath("/settings/sports");
}

export async function updateSport(id: string, formData: FormData) {
  await requireAuth();
  const yearlyFeeStr = formData.get("yearly_fee") as string;
  await query(
    `UPDATE sports SET name=$1, description=$2, monthly_fee=$3, yearly_fee=$4, color=$5, sort_order=$6, active=$7
     WHERE id=$8`,
    [
      formData.get("name"),
      formData.get("description") || null,
      parseFloat(formData.get("monthly_fee") as string) || 0,
      yearlyFeeStr ? parseFloat(yearlyFeeStr) : null,
      formData.get("color") || "#dc2626",
      parseInt(formData.get("sort_order") as string) || 0,
      formData.get("active") === "true",
      id,
    ]
  );
  revalidatePath("/settings/sports");
}

export async function deleteSport(id: string) {
  await requireAuth();
  await query("DELETE FROM sports WHERE id = $1", [id]);
  revalidatePath("/settings/sports");
}

export async function createPlan(formData: FormData) {
  await requireAuth();
  const yearlyFeeStr = formData.get("yearly_fee") as string;
  await query(
    `INSERT INTO subscription_plans (name, description, monthly_fee, yearly_fee, includes_all_sports)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      formData.get("name"),
      formData.get("description") || null,
      parseFloat(formData.get("monthly_fee") as string) || 0,
      yearlyFeeStr ? parseFloat(yearlyFeeStr) : null,
      true,
    ]
  );
  revalidatePath("/settings/sports");
}

export async function updatePlan(id: string, formData: FormData) {
  await requireAuth();
  const yearlyFeeStr = formData.get("yearly_fee") as string;
  await query(
    `UPDATE subscription_plans SET name=$1, description=$2, monthly_fee=$3, yearly_fee=$4, active=$5
     WHERE id=$6`,
    [
      formData.get("name"),
      formData.get("description") || null,
      parseFloat(formData.get("monthly_fee") as string) || 0,
      yearlyFeeStr ? parseFloat(yearlyFeeStr) : null,
      formData.get("active") === "true",
      id,
    ]
  );
  revalidatePath("/settings/sports");
}

export async function deletePlan(id: string) {
  await requireAuth();
  await query("DELETE FROM subscription_plans WHERE id = $1", [id]);
  revalidatePath("/settings/sports");
}
