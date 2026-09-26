import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@starter/env/server";
const client = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});
export async function createBlogImageUpload(contentType: string) {
  if (!contentType.startsWith("image/")) throw new Error("Images only");
  const key = `blog/${crypto.randomUUID()}`;
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, ContentType: contentType }),
    { expiresIn: 300 },
  );
  return { uploadUrl, publicUrl: `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}` };
}
