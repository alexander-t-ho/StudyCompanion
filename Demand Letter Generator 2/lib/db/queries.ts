import { prisma } from './client'
import type { User, Document, Template, MedicalProvider, DocumentSection } from '@prisma/client'

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email },
  })
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
  })
}

/**
 * Create a new user
 */
export async function createUser(email: string, passwordHash: string): Promise<User> {
  return prisma.user.create({
    data: {
      email,
      passwordHash,
    },
  })
}

/**
 * Get all documents for a user
 */
export async function getDocumentsByUser(userId: string): Promise<Document[]> {
  return prisma.document.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get document with all related data
 */
export async function getDocumentWithSections(id: string): Promise<Document & {
  sections: DocumentSection[]
  template: Template | null
  sourceDocs: any[]
  medicalProviders: MedicalProvider[]
} | null> {
  return prisma.document.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { order: 'asc' },
      },
      template: true,
      sourceDocs: true,
      medicalProviders: true,
      transcriptions: true,
    },
  })
}

/**
 * Get template by ID
 */
export async function getTemplateById(id: string): Promise<Template | null> {
  return prisma.template.findUnique({
    where: { id },
  })
}

/**
 * Get all templates, optionally including defaults
 */
export async function getTemplates(includeDefaults: boolean = true): Promise<Template[]> {
  if (includeDefaults) {
    return prisma.template.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    })
  }
  return prisma.template.findMany({
    where: { isDefault: false },
    orderBy: { name: 'asc' },
  })
}

/**
 * Get medical providers for a document
 */
export async function getMedicalProvidersByDocument(
  documentId: string
): Promise<MedicalProvider[]> {
  return prisma.medicalProvider.findMany({
    where: { documentId },
    orderBy: { providerName: 'asc' },
  })
}

/**
 * Get selected medical providers for a document
 */
export async function getSelectedMedicalProviders(
  documentId: string
): Promise<MedicalProvider[]> {
  return prisma.medicalProvider.findMany({
    where: {
      documentId,
      isSelected: true,
    },
    orderBy: { providerName: 'asc' },
  })
}

/**
 * Get document sections ordered by order field
 */
export async function getDocumentSections(
  documentId: string
): Promise<DocumentSection[]> {
  return prisma.documentSection.findMany({
    where: { documentId },
    orderBy: { order: 'asc' },
  })
}

