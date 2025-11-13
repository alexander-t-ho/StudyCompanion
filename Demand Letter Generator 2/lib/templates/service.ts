import { prisma } from '@/lib/db/client'
import type { Template } from '@prisma/client'
import type { CreateTemplateInput, UpdateTemplateInput } from './types'

export class TemplateService {
  /**
   * Get all templates
   */
  async getAll(includeDefaults: boolean = true): Promise<Template[]> {
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
   * Get template by ID
   */
  async getById(id: string): Promise<Template | null> {
    return prisma.template.findUnique({
      where: { id },
    })
  }

  /**
   * Create a new template
   */
  async create(data: CreateTemplateInput): Promise<Template> {
    return prisma.template.create({
      data: {
        name: data.name,
        content: data.content ?? null,
        styleMetadata: data.styleMetadata ?? null,
        toneMetadata: data.toneMetadata ?? null,
        isDefault: false,
      },
    })
  }

  /**
   * Update a template
   */
  async update(id: string, data: UpdateTemplateInput): Promise<Template> {
    return prisma.template.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.styleMetadata !== undefined && { styleMetadata: data.styleMetadata }),
        ...(data.toneMetadata !== undefined && { toneMetadata: data.toneMetadata }),
      },
    })
  }

  /**
   * Delete a template (cannot delete default templates)
   */
  async delete(id: string): Promise<boolean> {
    const template = await prisma.template.findUnique({
      where: { id },
    })

    if (!template) {
      throw new Error('Template not found')
    }

    if (template.isDefault) {
      throw new Error('Cannot delete default template')
    }

    await prisma.template.delete({
      where: { id },
    })

    return true
  }

  /**
   * Get default templates
   */
  async getDefaults(): Promise<Template[]> {
    return prisma.template.findMany({
      where: { isDefault: true },
      orderBy: { name: 'asc' },
    })
  }
}

export const templateService = new TemplateService()

