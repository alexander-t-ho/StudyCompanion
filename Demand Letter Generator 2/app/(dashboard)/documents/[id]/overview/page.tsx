'use client'

import { useParams } from 'next/navigation'
import OverviewPanel from '@/components/overview/OverviewPanel'

export default function OverviewPage() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-5xl mx-auto py-6">
        <OverviewPanel documentId={id} />
      </div>
    </div>
  )
}

