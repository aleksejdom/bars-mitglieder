import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { minioClient, BUCKET, memberPhotoKey, isMinioConfigured } from "@/lib/minio";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    if (!isMinioConfigured()) {
      return new NextResponse(null, { status: 404 });
    }

    const { id } = await params;
    const key = memberPhotoKey(id);

    // Stat first to get content-type, then stream
    let contentType = "image/jpeg";
    try {
      const stat = await minioClient.statObject(BUCKET, key);
      contentType =
        stat.metaData?.["content-type"] ||
        stat.metaData?.["Content-Type"] ||
        "image/jpeg";
    } catch {
      // stat failed but we can still try to serve the object
    }

    const stream = await minioClient.getObject(BUCKET, key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const data = Buffer.concat(chunks);

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
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
        { error: "Foto-Upload nicht verfügbar. Bitte MINIO_SECRET_KEY in den Umgebungsvariablen setzen." },
        { status: 503 }
      );
    }

    const { id } = await params;

    const formData = await req.formData();
    const file = formData.get("photo") as File | null;
    if (!file) return NextResponse.json({ error: "Keine Datei ausgewählt" }, { status: 400 });

    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: "Nur JPG, PNG, WebP oder GIF erlaubt" },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Datei zu groß (max. 5 MB)" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = memberPhotoKey(id);

    await minioClient.putObject(BUCKET, key, buffer, buffer.length, {
      "content-type": file.type,
    });

    const photoUrl = `/api/members/${id}/photo`;
    await query(
      "UPDATE members SET photo_url=$1, updated_at=NOW() WHERE id=$2",
      [photoUrl, id]
    );

    return NextResponse.json({ ok: true, url: photoUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[photo POST]", msg);
    return NextResponse.json(
      { error: `Foto konnte nicht hochgeladen werden: ${msg}` },
      { status: 500 }
    );
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
        await minioClient.removeObject(BUCKET, memberPhotoKey(id));
      } catch {
        // object may not exist — continue to clear DB
      }
    }

    await query(
      "UPDATE members SET photo_url=NULL, updated_at=NOW() WHERE id=$1",
      [id]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fehler beim Löschen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
