#!/usr/bin/env tsx
/**
 * Setup and health check script
 * Verifies environment configuration and database connectivity
 * Run with: npm run check-setup
 */

import { testConnection, getDatabaseHealth } from '../lib/db/test-connection'
import * as fs from 'fs'
import * as path from 'path'

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'NEXTAUTH_URL',
  'OPENROUTER_API_KEY',
]

const optionalEnvVars = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_S3_BUCKET',
]

interface CheckResult {
  name: string
  status: 'pass' | 'fail' | 'warn'
  message: string
}

async function checkEnvFile(): Promise<CheckResult> {
  const envPath = path.join(process.cwd(), '.env')
  const envExamplePath = path.join(process.cwd(), 'env.example')
  
  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      return {
        name: 'Environment File',
        status: 'warn',
        message: '.env file not found. Copy env.example to .env and update values.',
      }
    }
    return {
      name: 'Environment File',
      status: 'fail',
      message: '.env file not found and env.example does not exist.',
    }
  }
  
  return {
    name: 'Environment File',
    status: 'pass',
    message: '.env file exists',
  }
}

function checkEnvVars(): CheckResult[] {
  const results: CheckResult[] = []
  
  // Check required vars
  for (const varName of requiredEnvVars) {
    const value = process.env[varName]
    if (!value || value.includes('your-') || value.includes('change-in-production')) {
      results.push({
        name: `Required: ${varName}`,
        status: 'fail',
        message: `Missing or not configured. Please set ${varName} in .env`,
      })
    } else {
      results.push({
        name: `Required: ${varName}`,
        status: 'pass',
        message: 'Configured',
      })
    }
  }
  
  // Check optional vars
  for (const varName of optionalEnvVars) {
    const value = process.env[varName]
    if (!value || value.includes('your-')) {
      results.push({
        name: `Optional: ${varName}`,
        status: 'warn',
        message: 'Not configured (optional for file uploads)',
      })
    } else {
      results.push({
        name: `Optional: ${varName}`,
        status: 'pass',
        message: 'Configured',
      })
    }
  }
  
  return results
}

async function checkDatabase(): Promise<CheckResult> {
  try {
    const isConnected = await testConnection()
    if (isConnected) {
      const health = await getDatabaseHealth()
      return {
        name: 'Database Connection',
        status: 'pass',
        message: `Connected (${health.responseTime}ms)`,
      }
    } else {
      return {
        name: 'Database Connection',
        status: 'fail',
        message: 'Failed to connect. Check DATABASE_URL and ensure PostgreSQL is running.',
      }
    }
  } catch (error) {
    return {
      name: 'Database Connection',
      status: 'fail',
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

function checkPort(port: number): CheckResult {
  try {
    const { execSync } = require('child_process')
    const result = execSync(`lsof -i :${port}`, { encoding: 'utf-8', stdio: 'pipe' })
    if (result.trim()) {
      return {
        name: `Port ${port}`,
        status: 'warn',
        message: `Port ${port} is in use. Server may already be running.`,
      }
    } else {
      return {
        name: `Port ${port}`,
        status: 'pass',
        message: `Port ${port} is available`,
      }
    }
  } catch (error) {
    // lsof returns non-zero if port is not in use
    return {
      name: `Port ${port}`,
      status: 'pass',
      message: `Port ${port} is available`,
    }
  }
}

async function main() {
  console.log('🔍 Checking setup...\n')
  
  // Load .env file if it exists
  const envPath = path.join(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    try {
      require('dotenv').config({ path: envPath })
    } catch (error) {
      // dotenv might not be installed, try to parse manually
      const envContent = fs.readFileSync(envPath, 'utf-8')
      envContent.split('\n').forEach(line => {
        const match = line.match(/^([^#=]+)=(.*)$/)
        if (match) {
          const key = match[1].trim()
          const value = match[2].trim().replace(/^["']|["']$/g, '')
          process.env[key] = value
        }
      })
    }
  }
  
  const results: CheckResult[] = []
  
  // Check .env file
  results.push(await checkEnvFile())
  
  // Check environment variables
  results.push(...checkEnvVars())
  
  // Check database
  results.push(await checkDatabase())
  
  // Check port
  results.push(checkPort(3003))
  
  // Print results
  console.log('Results:\n')
  let hasFailures = false
  let hasWarnings = false
  
  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️ ' : '❌'
    const status = result.status === 'pass' ? 'PASS' : result.status === 'warn' ? 'WARN' : 'FAIL'
    console.log(`${icon} [${status}] ${result.name}`)
    console.log(`   ${result.message}\n`)
    
    if (result.status === 'fail') hasFailures = true
    if (result.status === 'warn') hasWarnings = true
  }
  
  // Summary
  console.log('─'.repeat(50))
  if (hasFailures) {
    console.log('\n❌ Setup incomplete. Please fix the issues above.')
    console.log('\nQuick fixes:')
    console.log('1. Copy env.example to .env: cp env.example .env')
    console.log('2. Update .env with your actual values')
    console.log('3. Ensure PostgreSQL is running')
    console.log('4. Run: npm run db:push')
    process.exit(1)
  } else if (hasWarnings) {
    console.log('\n⚠️  Setup complete with warnings. Some optional features may not work.')
    console.log('\nTo start the server: npm run dev')
  } else {
    console.log('\n✅ Setup looks good!')
    console.log('\nTo start the server: npm run dev')
    console.log('Then visit: http://localhost:3003')
  }
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})

