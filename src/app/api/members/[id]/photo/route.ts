import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { s3, BUCKET, memberPhotoKey, isMinioConfigured } from "@/lib/minio";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    if (!isMinioConfigured()) return new NextResponse(null, { status: 404 });

    const { id } = await params;
    const key = memberPhotoKey(id);

    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));

    if (!res.Body) return new NextResponse(null, { status: 404 });

    const chunks: Uint8Array[] = [];
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const data = Buffer.concat(chunks);

    return new NextResponse(data, {
      headers: {
        "Content-Type": res.ContentType ?? "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: unknown) {
    const code = (err as { name?: string })?.name;
    if (code === "NoSuchKey" || code === "NotFound") {
      return new NextResponse(null, { status: 404 });
    }
    console.error("[photo GET]", err);
    return new NextResponse(null, { status: 404 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    if (!isMinioConfigured()) {
      return NextResponse.json(
        { error: "Foto-Upload nicht verfügbar (MINIO_SECRET_KEY fehlt)" },
        { status: 503 }
      );
    }

    const { id } = await params;
    const formData = await req.formData();
    const file = formData.get("photo") as File | null;

    if (!file) return NextResponse.json({ error: "Keine Datei ausgewählt" }, { status: 400 });
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: "Nur JPG, PNG, WebP oder GIF erlaubt" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Datei zu groß (max. 5 MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = memberPhotoKey(id);

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ContentLength: buffer.length,
    }));

    const photoUrl = `/api/members/${id}/photo`;
    await query("UPDATE members SET photo_url=$1, updated_at=NOW() WHERE id=$2", [photoUrl, id]);

    return NextResponse.json({ ok: true, url: photoUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[photo POST]", msg);
    return NextResponse.json({ error: `Upload fehlgeschlagen: ${msg}` }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;

    if (isMinioConfigured()) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: memberPhotoKey(id) }));
      } catch {
        // object may not exist — continue to clear DB
      }
    }

    await query("UPDATE members SET photo_url=NULL, updated_at=NOW() WHERE id=$1", [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fehler beim Löschen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
