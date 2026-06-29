import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

function buildEndpoint(): string {
  const host = process.env.MINIO_ENDPOINT || "minio.domowets.de";
  // Accept both "host" and "http(s)://host:port" formats
  if (host.startsWith("http://") || host.startsWith("https://")) return host;
  const port = process.env.MINIO_PORT || "9000";
  const useSSL = process.env.MINIO_USE_SSL === "true";
  return `${useSSL ? "https" : "http"}://${host}:${port}`;
}

export const s3 = new S3Client({
  region: "us-east-1",
  endpoint: buildEndpoint(),
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || "admin",
    secretAccessKey: process.env.MINIO_SECRET_KEY || "",
  },
  forcePathStyle: true,
});

export const BUCKET = process.env.MINIO_BUCKET || "mitglieder";

export function memberPhotoKey(memberId: string) {
  return `photos/${memberId}`;
}

export function photoProxyUrl(memberId: string) {
  return `/api/members/${memberId}/photo`;
}

export function isMinioConfigured(): boolean {
  return !!(process.env.MINIO_SECRET_KEY);
}
