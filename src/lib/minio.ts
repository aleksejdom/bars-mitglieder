import * as Minio from "minio";

export function isMinioConfigured(): boolean {
  return !!(process.env.MINIO_SECRET_KEY);
}

export const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "minio.domowets.de",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "admin",
  secretKey: process.env.MINIO_SECRET_KEY || "",
});

export const BUCKET = process.env.MINIO_BUCKET || "mitglieder";

export function memberPhotoKey(memberId: string) {
  return `photos/${memberId}`;
}

export function photoProxyUrl(memberId: string) {
  return `/api/members/${memberId}/photo`;
}
