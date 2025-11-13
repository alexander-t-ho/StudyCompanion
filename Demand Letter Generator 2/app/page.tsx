'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated
    fetch('/api/auth/verify')
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          router.push('/dashboard')
        } else {
          router.push('/login')
        }
      })
      .catch(() => {
        router.push('/login')
      })
  }, [router])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4">DemandsAI</h1>
        <p className="text-lg">Demand Letter Generator POC</p>
        <p className="text-sm text-gray-500 mt-4">Redirecting...</p>
      </div>
    </main>
  )
}

