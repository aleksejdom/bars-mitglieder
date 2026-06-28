import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { minioClient, BUCKET, memberPhotoKey } from "@/lib/minio";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    const key = memberPhotoKey(id);

    const stream = await minioClient.getObject(BUCKET, key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const data = Buffer.concat(chunks);

    const stat = await minioClient.statObject(BUCKET, key);
    const contentType = stat.metaData?.["content-type"] || "image/jpeg";

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
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

    const { id } = await params;

    const formData = await req.formData();
    const file = formData.get("photo") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

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
      "Content-Type": file.type,
    });

    const photoUrl = `/api/members/${id}/photo`;
    await query(
      "UPDATE members SET photo_url=$1, updated_at=NOW() WHERE id=$2",
      [photoUrl, id]
    );

    return NextResponse.json({ ok: true, url: photoUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload fehlgeschlagen";
    console.error("[photo POST]", message);
    return NextResponse.json({ error: message }, { status: 500 });
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

    try {
      await minioClient.removeObject(BUCKET, memberPhotoKey(id));
    } catch {
      // object may not exist — continue to clear DB
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
