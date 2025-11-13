import { prisma } from '@/lib/db/client'
import type { Document, DocumentSection } from '@prisma/client'

export interface CreateDocumentInput {
  userId: string
  filename: string
  templateId?: string
  metadata?: any
}

export interface UpdateDocumentInput {
  filename?: string
  status?: string
  metadata?: any
}

export interface CreateSectionInput {
  documentId: string
  sectionType: string
  content: string
  order?: number
  isGenerated?: boolean
  metadata?: any
}

export interface UpdateSectionInput {
  content?: string
  order?: number
  isGenerated?: boolean
  metadata?: any
}

export class DocumentService {
  /**
   * Create a new document
   */
  async create(data: CreateDocumentInput): Promise<Document> {
    return prisma.document.create({
      data: {
        userId: data.userId,
        filename: data.filename,
        templateId: data.templateId,
        metadata: data.metadata || {},
        status: 'draft',
      },
    })
  }

  /**
   * Get document by ID with all relations
   */
  async getById(id: string, userId?: string): Promise<Document & {
    sections: DocumentSection[]
    template: any
    sourceDocs: any[]
    medicalProviders: any[]
  } | null> {
    const where: any = { id }
    if (userId) {
      where.userId = userId
    }

    return prisma.document.findFirst({
      where,
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
   * Update document
   */
  async update(id: string, userId: string, data: UpdateDocumentInput): Promise<Document> {
    // Verify ownership
    const existing = await prisma.document.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      throw new Error('Document not found or access denied')
    }

    return prisma.document.update({
      where: { id },
      data: {
        ...(data.filename && { filename: data.filename }),
        ...(data.status && { status: data.status }),
        ...(data.metadata !== undefined && { metadata: data.metadata }),
      },
    })
  }

  /**
   * Delete document
   */
  async delete(id: string, userId: string): Promise<boolean> {
    // Verify ownership
    const existing = await prisma.document.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      throw new Error('Document not found or access denied')
    }

    await prisma.document.delete({
      where: { id },
    })

    return true
  }

  /**
   * List documents for a user
   */
  async list(
    userId: string,
    filters?: {
      status?: string
      limit?: number
      offset?: number
    }
  ): Promise<{ documents: Document[]; total: number }> {
    const where: any = { userId }
    if (filters?.status) {
      where.status = filters.status
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
        include: {
          template: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.document.count({ where }),
    ])

    return { documents, total }
  }
}

export class SectionService {
  /**
   * Add section to document
   */
  async addSection(data: CreateSectionInput): Promise<DocumentSection> {
    // Get current max order
    const existingSections = await prisma.documentSection.findMany({
      where: { documentId: data.documentId },
      orderBy: { order: 'desc' },
      take: 1,
    })

    const maxOrder = existingSections[0]?.order ?? -1
    const order = data.order !== undefined ? data.order : maxOrder + 1

    return prisma.documentSection.create({
      data: {
        documentId: data.documentId,
        sectionType: data.sectionType,
        content: data.content,
        order,
        isGenerated: data.isGenerated ?? false,
        metadata: data.metadata || {},
      },
    })
  }

  /**
   * Update section
   */
  async updateSection(
    sectionId: string,
    documentId: string,
    data: UpdateSectionInput
  ): Promise<DocumentSection> {
    // Verify section belongs to document
    const existing = await prisma.documentSection.findFirst({
      where: { id: sectionId, documentId },
    })

    if (!existing) {
      throw new Error('Section not found')
    }

    return prisma.documentSection.update({
      where: { id: sectionId },
      data: {
        ...(data.content !== undefined && { content: data.content }),
        ...(data.order !== undefined && { order: data.order }),
        ...(data.isGenerated !== undefined && { isGenerated: data.isGenerated }),
        ...(data.metadata !== undefined && { metadata: data.metadata }),
      },
    })
  }

  /**
   * Delete section
   */
  async deleteSection(sectionId: string, documentId: string): Promise<boolean> {
    // Verify section belongs to document
    const existing = await prisma.documentSection.findFirst({
      where: { id: sectionId, documentId },
    })

    if (!existing) {
      throw new Error('Section not found')
    }

    await prisma.documentSection.delete({
      where: { id: sectionId },
    })

    return true
  }

  /**
   * Reorder sections
   */
  async reorderSections(
    documentId: string,
    sectionIds: string[]
  ): Promise<boolean> {
    // Verify all sections belong to document
    const sections = await prisma.documentSection.findMany({
      where: {
        id: { in: sectionIds },
        documentId,
      },
    })

    if (sections.length !== sectionIds.length) {
      throw new Error('Some sections not found')
    }

    // Update order for each section
    await Promise.all(
      sectionIds.map((id, index) =>
        prisma.documentSection.update({
          where: { id },
          data: { order: index },
        })
      )
    )

    return true
  }

  /**
   * Get sections for document
   */
  async getSections(documentId: string): Promise<DocumentSection[]> {
    return prisma.documentSection.findMany({
      where: { documentId },
      orderBy: { order: 'asc' },
    })
  }
}

export const documentService = new DocumentService()
export const sectionService = new SectionService()

