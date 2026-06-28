"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
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

export async function register(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!name || !email || !password) {
    return { error: "Alle Felder sind erforderlich." };
  }
  if (password.length < 8) {
    return { error: "Passwort muss mindestens 8 Zeichen lang sein." };
  }
  if (password !== confirm) {
    return { error: "Passwörter stimmen nicht überein." };
  }

  const existing = await queryOne(
    "SELECT id FROM users WHERE email = $1",
    [email]
  );
  if (existing) {
    return { error: "Diese E-Mail-Adresse ist bereits registriert." };
  }

  const hash = await bcrypt.hash(password, 10);
  const [user] = await query<{ id: string; email: string; name: string }>(
    "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name",
    [email, hash, name]
  );

  await createSession({ id: user.id, email: user.email, name: user.name });
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
