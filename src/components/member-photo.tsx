"use client";

import { useRef, useState } from "react";
import { Camera, Trash2, Loader2, User } from "lucide-react";

export function MemberPhoto({
  memberId,
  hasPhoto,
  name,
}: {
  memberId: string;
  hasPhoto: boolean;
  name: string;
}) {
  const [photo, setPhoto] = useState(
    hasPhoto ? `/api/members/${memberId}/photo?t=${Date.now()}` : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch(`/api/members/${memberId}/photo`, { method: "POST", body: fd });
      let data: { error?: string; ok?: boolean } = {};
      try { data = await res.json(); } catch { /* empty body */ }
      if (!res.ok) {
        setError(data.error || "Fehler beim Hochladen");
      } else {
        setPhoto(`/api/members/${memberId}/photo?t=${Date.now()}`);
      }
    } catch {
      setError("Verbindungsfehler beim Hochladen");
    }
    setLoading(false);
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);
    await fetch(`/api/members/${memberId}/photo`, { method: "DELETE" });
    setPhoto(null);
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <div
          className="w-24 h-24 rounded-full overflow-hidden border-2 border-border bg-primary/10 flex items-center justify-center cursor-pointer"
          onClick={() => !loading && inputRef.current?.click()}
        >
          {loading ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt={name}
              className="w-full h-full object-cover"
              onError={() => setPhoto(null)}
            />
          ) : (
            <span className="text-primary font-bold text-2xl">{initials}</span>
          )}

          {/* Hover overlay */}
          {!loading && (
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
          )}
        </div>

        {photo && !loading && (
          <button
            onClick={handleDelete}
            className="absolute -top-1 -right-1 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center hover:bg-destructive/80 transition-colors"
            title="Foto entfernen"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
      >
        <User className="w-3 h-3" />
        Foto {photo ? "ändern" : "hochladen"}
      </button>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
