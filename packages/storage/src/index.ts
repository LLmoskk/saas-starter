import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { services } from "@starter/env/server";
export async function createBlogImageUpload(contentType: string) {
  const config = services.storage;
  if (!config) throw new Error("Storage is not enabled");
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  if (!contentType.startsWith("image/")) throw new Error("Images only");
  const key = `blog/${crypto.randomUUID()}`;
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: config.bucket, Key: key, ContentType: contentType }),
    { expiresIn: 300 },
  );
  return { uploadUrl, publicUrl: `${config.publicBaseUrl.replace(/\/$/, "")}/${key}` };
}
