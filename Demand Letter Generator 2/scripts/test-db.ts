#!/usr/bin/env ts-node
/**
 * Test database connection script
 * Run with: npx ts-node scripts/test-db.ts
 */

import { testConnection, getDatabaseHealth } from '../lib/db/test-connection'

async function main() {
  console.log('Testing database connection...')
  
  const isConnected = await testConnection()
  if (isConnected) {
    console.log('✅ Database connection successful!')
    
    const health = await getDatabaseHealth()
    console.log('Database health:', health)
  } else {
    console.error('❌ Database connection failed!')
    console.error('Please check your DATABASE_URL in .env file')
    process.exit(1)
  }
}

main()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })

