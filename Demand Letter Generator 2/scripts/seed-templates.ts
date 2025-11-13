/**
 * Seed default templates into the database
 * Run with: npm run seed:templates
 */

import { seedTemplates, needsSeeding } from '../lib/templates/seed'
import { prisma } from '../lib/db/client'

async function main() {
  console.log('Checking if templates need seeding...')
  
  const needsSeed = await needsSeeding()
  
  if (!needsSeed) {
    console.log('✓ Templates already seeded')
    return
  }
  
  await seedTemplates()
}

main()
  .catch((error) => {
    console.error('Error seeding templates:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

