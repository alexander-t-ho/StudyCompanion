export interface TranscriptionResult {
  transcript: string
  duration?: number
  wordCount: number
}

export interface TranscriptionData {
  id: string
  filename: string
  s3Key: string
  transcript: string
  duration?: number
  wordCount: number
  status: 'processing' | 'completed' | 'failed'
  createdAt: Date
}

