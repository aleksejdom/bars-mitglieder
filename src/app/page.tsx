"use client";

import { useEffect, useState } from "react";

type Mitglied = {
  id: number;
  name: string;
  email: string;
  telefon: string;
  eintrittsdatum: string;
  status: string;
};

const empty = {
  name: "",
  email: "",
  telefon: "",
  eintrittsdatum: new Date().toISOString().split("T")[0],
  status: "aktiv",
};

export default function Home() {
  const [mitglieder, setMitglieder] = useState<Mitglied[]>([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/mitglieder");
    setMitglieder(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (editId !== null) {
      await fetch(`/api/mitglieder/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setEditId(null);
    } else {
      await fetch("/api/mitglieder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setForm(empty);
    await load();
    setLoading(false);
  }

  async function remove(id: number) {
    if (!confirm("Mitglied wirklich löschen?")) return;
    await fetch(`/api/mitglieder/${id}`, { method: "DELETE" });
    await load();
  }

  function startEdit(m: Mitglied) {
    setEditId(m.id);
    setForm({
      name: m.name,
      email: m.email,
      telefon: m.telefon ?? "",
      eintrittsdatum: m.eintrittsdatum.split("T")[0],
      status: m.status,
    });
  }

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Bars Mitgliederverwaltung</h1>

      <form
        onSubmit={submit}
        className="bg-white border rounded-lg p-4 mb-8 grid grid-cols-2 gap-3"
      >
        <h2 className="col-span-2 font-semibold text-lg">
          {editId !== null ? "Mitglied bearbeiten" : "Neues Mitglied"}
        </h2>

        <input
          required
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border rounded px-3 py-2"
        />
        <input
          required
          type="email"
          placeholder="E-Mail"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="border rounded px-3 py-2"
        />
        <input
          placeholder="Telefon"
          value={form.telefon}
          onChange={(e) => setForm({ ...form, telefon: e.target.value })}
          className="border rounded px-3 py-2"
        />
        <input
          type="date"
          value={form.eintrittsdatum}
          onChange={(e) =>
            setForm({ ...form, eintrittsdatum: e.target.value })
          }
          className="border rounded px-3 py-2"
        />
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="border rounded px-3 py-2"
        >
          <option value="aktiv">Aktiv</option>
          <option value="inaktiv">Inaktiv</option>
        </select>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {editId !== null ? "Speichern" : "Hinzufügen"}
          </button>
          {editId !== null && (
            <button
              type="button"
              onClick={() => {
                setEditId(null);
                setForm(empty);
              }}
              className="border px-4 py-2 rounded hover:bg-gray-50"
            >
              Abbrechen
            </button>
          )}
        </div>
      </form>

      <table className="w-full border rounded-lg overflow-hidden text-sm">
        <thead className="bg-gray-100">
          <tr>
            {["Name", "E-Mail", "Telefon", "Eintritt", "Status", ""].map(
              (h) => (
                <th key={h} className="text-left px-4 py-2 font-medium">
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {mitglieder.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center py-8 text-gray-400">
                Keine Mitglieder vorhanden
              </td>
            </tr>
          )}
          {mitglieder.map((m) => (
            <tr key={m.id} className="border-t hover:bg-gray-50">
              <td className="px-4 py-2">{m.name}</td>
              <td className="px-4 py-2">{m.email}</td>
              <td className="px-4 py-2">{m.telefon}</td>
              <td className="px-4 py-2">{m.eintrittsdatum.split("T")[0]}</td>
              <td className="px-4 py-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    m.status === "aktiv"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {m.status}
                </span>
              </td>
              <td className="px-4 py-2 flex gap-2">
                <button
                  onClick={() => startEdit(m)}
                  className="text-blue-600 hover:underline"
                >
                  Bearbeiten
                </button>
                <button
                  onClick={() => remove(m.id)}
                  className="text-red-500 hover:underline"
                >
                  Löschen
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
