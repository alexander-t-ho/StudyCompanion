import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const PREFIX = 'alexho-'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET || ''

/**
 * Generate unique S3 key with prefix
 */
export function generateS3Key(filename: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `${PREFIX}${timestamp}-${random}-${sanitizedFilename}`
}

/**
 * Upload file to S3
 */
export async function uploadToS3(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  })

  await s3Client.send(command)
}

/**
 * Get presigned URL for file download
 */
export async function getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  return await getSignedUrl(s3Client, command, { expiresIn })
}

/**
 * Get file from S3
 */
export async function getFileFromS3(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  const response = await s3Client.send(command)
  
  if (!response.Body) {
    throw new Error('File not found in S3')
  }

  const chunks: Uint8Array[] = []
  const reader = response.Body.transformToWebStream().getReader()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }

  // Combine chunks into single buffer
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }

  return Buffer.from(result)
}

export { s3Client, BUCKET_NAME, PREFIX }

