"use client";

import { useState, useTransition } from "react";
import { updateCustomFieldValue } from "@/lib/actions/fields";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2, Check, Loader2 } from "lucide-react";

type CustomField = {
  id: string;
  name: string;
  label: string;
  field_type: string;
  required: boolean;
  options: string[] | null;
};

type FieldValue = {
  field_id: string;
  value: string | null;
};

function FieldInput({
  memberId,
  field,
  currentValue,
}: {
  memberId: string;
  field: CustomField;
  currentValue: string | null;
}) {
  const [value, setValue] = useState(currentValue ?? "");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function save(newValue: string) {
    if (newValue === (currentValue ?? "")) return;
    startTransition(async () => {
      await updateCustomFieldValue(memberId, field.id, newValue);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  const baseClass =
    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  if (field.field_type === "boolean") {
    return (
      <div className="flex items-center gap-3">
        <select
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            save(e.target.value);
          }}
          className={baseClass}
        >
          <option value="">—</option>
          <option value="true">Ja</option>
          <option value="false">Nein</option>
        </select>
        {saved && <Check className="w-4 h-4 text-green-500 shrink-0" />}
        {isPending && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
      </div>
    );
  }

  if (field.field_type === "select" && field.options) {
    return (
      <div className="flex items-center gap-3">
        <select
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            save(e.target.value);
          }}
          className={baseClass}
        >
          <option value="">— auswählen —</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {saved && <Check className="w-4 h-4 text-green-500 shrink-0" />}
        {isPending && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Input
        type={field.field_type === "date" ? "date" : field.field_type === "number" ? "number" : "text"}
        value={value}
        required={field.required}
        onChange={(e) => setValue(e.target.value)}
        onBlur={(e) => save(e.target.value)}
      />
      {saved && <Check className="w-4 h-4 text-green-500 shrink-0" />}
      {isPending && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
    </div>
  );
}

export function CustomFieldsCard({
  memberId,
  fields,
  values,
}: {
  memberId: string;
  fields: CustomField[];
  values: FieldValue[];
}) {
  if (fields.length === 0) return null;

  const valueMap = Object.fromEntries(
    values.map((v) => [v.field_id, v.value])
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          Benutzerdefinierte Felder
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.id} className="space-y-1.5">
            <Label>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <FieldInput
              memberId={memberId}
              field={field}
              currentValue={valueMap[field.id] ?? null}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
