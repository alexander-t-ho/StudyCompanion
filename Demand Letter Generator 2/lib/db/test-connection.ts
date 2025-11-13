import { prisma } from './client'

/**
 * Test database connection
 * Useful for health checks and initialization
 */
export async function testConnection(): Promise<boolean> {
  try {
    await prisma.$connect()
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Get database health status
 */
export async function getDatabaseHealth() {
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const responseTime = Date.now() - start

    return {
      status: 'healthy',
      responseTime,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
}

