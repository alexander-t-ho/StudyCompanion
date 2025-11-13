'use client'

import { useParams } from 'next/navigation'
import DocumentEditor from '@/components/editor/DocumentEditor'

export default function DocumentPage() {
  const params = useParams()
  const id = params.id as string

  return <DocumentEditor documentId={id} />
}

