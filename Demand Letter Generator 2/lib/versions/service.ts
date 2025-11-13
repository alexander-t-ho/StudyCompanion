import { prisma } from '@/lib/db/client'

export type ChangeType = 'create' | 'update' | 'delete' | 'restore' | 'generate'

export interface CreateVersionInput {
  documentId: string
  userId: string
  changeType: ChangeType
  changeSummary?: string
  sectionId?: string // For section-specific changes
}

export class VersionService {
  /**
   * Create a new document version snapshot
   */
  async createVersion(input: CreateVersionInput) {
    const { documentId, userId, changeType, changeSummary, sectionId } = input

    // Get current document state
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!document) {
      throw new Error('Document not found')
    }

    // Get next version number
    const lastVersion = await prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
    })

    const versionNumber = (lastVersion?.versionNumber || 0) + 1

    // Create snapshot
    const snapshot = {
      sections: document.sections.map((s) => ({
        id: s.id,
        sectionType: s.sectionType,
        content: s.content,
        order: s.order,
        isGenerated: s.isGenerated,
        metadata: s.metadata,
      })),
      metadata: document.metadata,
    }

    // Save version
    const version = await prisma.documentVersion.create({
      data: {
        documentId,
        versionNumber,
        userId,
        snapshot: snapshot as any,
        changeType,
        changeSummary: changeSummary || this.generateChangeSummary(changeType, sectionId),
      },
    })

    // Update document's current version
    await prisma.document.update({
      where: { id: documentId },
      data: { currentVersion: versionNumber },
    })

    return version
  }

  /**
   * Create a section-specific version
   */
  async createSectionVersion(
    sectionId: string,
    userId: string,
    content: string,
    changeType: ChangeType
  ) {
    const section = await prisma.documentSection.findUnique({
      where: { id: sectionId },
    })

    if (!section) {
      throw new Error('Section not found')
    }

    // Get next version number for this section
    const lastVersion = await prisma.sectionVersion.findFirst({
      where: { sectionId },
      orderBy: { versionNumber: 'desc' },
    })

    const versionNumber = (lastVersion?.versionNumber || 0) + 1

    // Create section version
    const version = await prisma.sectionVersion.create({
      data: {
        sectionId,
        versionNumber,
        userId,
        content,
        changeType,
      },
    })

    // Update section's current version
    await prisma.documentSection.update({
      where: { id: sectionId },
      data: { currentVersion: versionNumber },
    })

    return version
  }

  /**
   * Get version history for a document
   */
  async getVersions(documentId: string, limit = 50) {
    return prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    })
  }

  /**
   * Get section version history
   */
  async getSectionVersions(sectionId: string, limit = 50) {
    return prisma.sectionVersion.findMany({
      where: { sectionId },
      orderBy: { versionNumber: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    })
  }

  /**
   * Get a specific version
   */
  async getVersion(documentId: string, versionNumber: number) {
    return prisma.documentVersion.findUnique({
      where: {
        documentId_versionNumber: {
          documentId,
          versionNumber,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    })
  }

  /**
   * Restore document to a specific version
   */
  async restoreVersion(
    documentId: string,
    versionNumber: number,
    userId: string
  ) {
    const version = await prisma.documentVersion.findUnique({
      where: {
        documentId_versionNumber: {
          documentId,
          versionNumber,
        },
      },
    })

    if (!version) {
      throw new Error('Version not found')
    }

    const snapshot = version.snapshot as any

    // Delete existing sections
    await prisma.documentSection.deleteMany({
      where: { documentId },
    })

    // Restore sections
    if (snapshot.sections && snapshot.sections.length > 0) {
      await prisma.documentSection.createMany({
        data: snapshot.sections.map((s: any) => ({
          documentId,
          sectionType: s.sectionType,
          content: s.content,
          order: s.order,
          isGenerated: s.isGenerated ?? false,
          metadata: s.metadata,
        })),
      })
    }

    // Restore metadata
    await prisma.document.update({
      where: { id: documentId },
      data: {
        metadata: snapshot.metadata,
        currentVersion: versionNumber,
      },
    })

    // Create restore version entry
    await this.createVersion({
      documentId,
      userId,
      changeType: 'restore',
      changeSummary: `Restored to version ${versionNumber}`,
    })

    return version
  }

  /**
   * Undo last change (restore to previous version)
   */
  async undo(documentId: string, userId: string) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    })

    if (!document || !document.currentVersion || document.currentVersion <= 1) {
      throw new Error('Cannot undo: no previous version')
    }

    const previousVersion = document.currentVersion - 1
    return this.restoreVersion(documentId, previousVersion, userId)
  }

  /**
   * Redo last undone change
   */
  async redo(documentId: string, userId: string) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    })

    if (!document) {
      throw new Error('Document not found')
    }

    const currentVersion = document.currentVersion || 0

    // Get next version
    const nextVersion = await prisma.documentVersion.findFirst({
      where: {
        documentId,
        versionNumber: { gt: currentVersion },
      },
      orderBy: { versionNumber: 'asc' },
    })

    if (!nextVersion) {
      throw new Error('Cannot redo: no next version')
    }

    return this.restoreVersion(documentId, nextVersion.versionNumber, userId)
  }

  /**
   * Get previous version number
   */
  async getPreviousVersionNumber(documentId: string): Promise<number | null> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { currentVersion: true },
    })

    if (!document || !document.currentVersion || document.currentVersion <= 1) {
      return null
    }

    return document.currentVersion - 1
  }

  /**
   * Get next version number (for redo)
   */
  async getNextVersionNumber(documentId: string): Promise<number | null> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { currentVersion: true },
    })

    if (!document) {
      return null
    }

    const currentVersion = document.currentVersion || 0

    const nextVersion = await prisma.documentVersion.findFirst({
      where: {
        documentId,
        versionNumber: { gt: currentVersion },
      },
      orderBy: { versionNumber: 'asc' },
    })

    return nextVersion ? nextVersion.versionNumber : null
  }

  /**
   * Generate change summary
   */
  private generateChangeSummary(changeType: ChangeType, sectionId?: string): string {
    const summaries: Record<ChangeType, string> = {
      create: 'Document created',
      update: sectionId ? 'Section updated' : 'Document updated',
      delete: sectionId ? 'Section deleted' : 'Document deleted',
      restore: 'Version restored',
      generate: sectionId ? 'Section generated' : 'Content generated',
    }

    return summaries[changeType] || 'Change made'
  }
}

export const versionService = new VersionService()

