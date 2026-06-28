"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { queryOne } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/auth";

type User = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
};

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "E-Mail und Passwort sind erforderlich." };
  }

  const user = await queryOne<User>(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  if (!user) {
    return { error: "Ungültige Anmeldedaten." };
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return { error: "Ungültige Anmeldedaten." };
  }

  await createSession({ id: user.id, email: user.email, name: user.name });
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
