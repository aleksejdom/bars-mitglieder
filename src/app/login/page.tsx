"use client";

import { useState, useTransition } from "react";
import { login } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-md px-4">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-white fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.2 5.9l.8-.8C21.8 4.3 22 3.8 22 3.3c0-1.2-.9-2.1-2.1-2.1-.5 0-1 .2-1.4.5L8.3 11.9c-.4-.1-.8-.2-1.2-.2C4.8 11.7 3 13.5 3 15.8S4.8 20 7.1 20s4.1-1.8 4.1-4.1c0-.5-.1-.9-.2-1.3l3.1-3.1 1 1-1.5 1.5c-.4.4-.4 1 0 1.4s1 .4 1.4 0l1.5-1.5 1 1-1.5 1.5c-.4.4-.4 1 0 1.4s1 .4 1.4 0l2.7-2.7c.8-.8.8-2 0-2.8l-1-1 1.5-1.5c.3-.4.3-.9 0-1.3z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">BoxClub</h1>
          <p className="text-slate-400 mt-1">Vereinsverwaltung</p>
        </div>

        <Card className="bg-slate-800 border-slate-700 shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-xl">Anmelden</CardTitle>
            <CardDescription className="text-slate-400">
              Bitte melden Sie sich mit Ihren Admin-Zugangsdaten an.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">E-Mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="admin@boxclub.de"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">Passwort</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-primary"
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-10"
              >
                {isPending ? "Anmeldung..." : "Anmelden"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-slate-500 text-xs mt-6">
          BoxClub Verwaltungssystem
        </p>
      </div>
    </div>
  );
}
