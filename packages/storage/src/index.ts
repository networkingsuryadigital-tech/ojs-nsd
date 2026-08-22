import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type UploadFileInput = {
  bucket: string;
  path: string;
  file: Buffer;
  contentType: string;
  upsert?: boolean;
};

export type StorageClientConfig = {
  endpoint?: string;
  /** Used for presigned download URLs reachable by browsers (e.g. https://domain/s3). */
  publicEndpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
};

function resolveConfig(config?: StorageClientConfig) {
  const endpoint = config?.endpoint ?? process.env.MINIO_ENDPOINT?.trim();
  const publicEndpoint =
    config?.publicEndpoint ?? process.env.MINIO_PUBLIC_ENDPOINT?.trim();
  const accessKeyId =
    config?.accessKeyId ?? process.env.MINIO_ACCESS_KEY?.trim();
  const secretAccessKey =
    config?.secretAccessKey ?? process.env.MINIO_SECRET_KEY?.trim();

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "MinIO is not configured (MINIO_ENDPOINT / MINIO_ACCESS_KEY / MINIO_SECRET_KEY)",
    );
  }

  return {
    endpoint,
    publicEndpoint: publicEndpoint || endpoint,
    accessKeyId,
    secretAccessKey,
    region: config?.region ?? "us-east-1",
  };
}

function getS3(config?: StorageClientConfig, options?: { public?: boolean }): S3Client {
  const resolved = resolveConfig(config);
  const endpoint = options?.public ? resolved.publicEndpoint : resolved.endpoint;
  return new S3Client({
    region: resolved.region,
    endpoint,
    credentials: {
      accessKeyId: resolved.accessKeyId,
      secretAccessKey: resolved.secretAccessKey,
    },
    forcePathStyle: true,
  });
}

/**
 * Upload object to MinIO/S3. Returns the object key (path).
 * Private buckets should use createSignedUrl for downloads.
 */
export async function uploadFile(
  input: UploadFileInput,
  config?: StorageClientConfig,
): Promise<string> {
  const client = getS3(config);
  await client.send(
    new PutObjectCommand({
      Bucket: input.bucket,
      Key: input.path,
      Body: input.file,
      ContentType: input.contentType,
    }),
  );
  return input.path;
}

export async function createSignedUrl(
  input: { bucket: string; path: string; expiresInSeconds?: number },
  config?: StorageClientConfig,
): Promise<string> {
  const client = getS3(config, { public: true });
  const command = new GetObjectCommand({
    Bucket: input.bucket,
    Key: input.path,
  });
  return getSignedUrl(client, command, {
    expiresIn: input.expiresInSeconds ?? 3600,
  });
}

export async function downloadFile(
  input: { bucket: string; path: string },
  config?: StorageClientConfig,
): Promise<Buffer> {
  const client = getS3(config);
  const result = await client.send(
    new GetObjectCommand({
      Bucket: input.bucket,
      Key: input.path,
    }),
  );

  if (!result.Body) {
    throw new Error("Failed to download file: empty body");
  }

  const bytes = await result.Body.transformToByteArray();
  return Buffer.from(bytes);
}

/** Ensure bucket exists (idempotent). Used by seed scripts. */
export async function ensureBucket(
  bucket: string,
  config?: StorageClientConfig,
): Promise<void> {
  const client = getS3(config);
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return;
  } catch {
    // create below
  }

  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes("already")) {
      throw error;
    }
  }
}
