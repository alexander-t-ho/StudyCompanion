import { prisma } from '@/lib/db/client'
import type { StyleMetadata, ToneMetadata } from './types'

const defaultTemplates = [
  {
    name: 'Standard Demand Letter',
    content: null,
    styleMetadata: {
      fonts: {
        heading: 'Times New Roman',
        body: 'Times New Roman',
      },
      spacing: {
        paragraph: 1.15,
        section: 2,
      },
      headers: {
        style: 'both',
        size: 14,
      },
      lists: {
        style: 'bullet',
      },
    } as StyleMetadata,
    toneMetadata: {
      formality: 'professional',
      voice: 'Professional and direct',
      descriptors: ['clear', 'concise', 'authoritative'],
    } as ToneMetadata,
    sections: ['introduction', 'liability', 'damages', 'conclusion'],
    isDefault: true,
  },
  {
    name: 'Personal Injury Demand',
    content: null,
    styleMetadata: {
      fonts: {
        heading: 'Times New Roman',
        body: 'Times New Roman',
      },
      spacing: {
        paragraph: 1.15,
        section: 2,
      },
      headers: {
        style: 'both',
        size: 14,
      },
      lists: {
        style: 'numbered',
      },
    } as StyleMetadata,
    toneMetadata: {
      formality: 'professional',
      voice: 'Empathetic yet assertive',
      descriptors: ['compassionate', 'detailed', 'persuasive'],
    } as ToneMetadata,
    sections: [
      'introduction',
      'statement_of_facts',
      'liability',
      'medical_chronology',
      'damages',
      'treatment_reasonableness',
      'conclusion',
    ],
    isDefault: true,
  },
  {
    name: 'UIM Demand Letter',
    content: null,
    styleMetadata: {
      fonts: {
        heading: 'Times New Roman',
        body: 'Times New Roman',
      },
      spacing: {
        paragraph: 1.15,
        section: 2,
      },
      headers: {
        style: 'underline',
        size: 14,
      },
      lists: {
        style: 'bullet',
      },
    } as StyleMetadata,
    toneMetadata: {
      formality: 'formal',
      voice: 'Formal and precise',
      descriptors: ['legal', 'precise', 'comprehensive'],
    } as ToneMetadata,
    sections: [
      'introduction',
      'coverage_analysis',
      'liability',
      'damages',
      'policy_limits',
      'conclusion',
    ],
    isDefault: true,
  },
  {
    name: '3P Liability Demand',
    content: null,
    styleMetadata: {
      fonts: {
        heading: 'Times New Roman',
        body: 'Times New Roman',
      },
      spacing: {
        paragraph: 1.15,
        section: 2,
      },
      headers: {
        style: 'bold',
        size: 14,
      },
      lists: {
        style: 'bullet',
      },
    } as StyleMetadata,
    toneMetadata: {
      formality: 'assertive',
      voice: 'Assertive and confident',
      descriptors: ['direct', 'confident', 'persuasive'],
    } as ToneMetadata,
    sections: [
      'introduction',
      'statement_of_facts',
      'negligence_analysis',
      'liability',
      'comparative_fault',
      'damages',
      'conclusion',
    ],
    isDefault: true,
  },
  {
    name: 'Insurance & Personal Injury',
    content: null,
    styleMetadata: {
      fonts: {
        heading: 'Times New Roman',
        body: 'Times New Roman',
      },
      spacing: {
        paragraph: 1.15,
        section: 2,
      },
      headers: {
        style: 'both',
        size: 14,
      },
      lists: {
        style: 'numbered',
      },
    } as StyleMetadata,
    toneMetadata: {
      formality: 'professional',
      voice: 'Professional and detailed',
      descriptors: ['thorough', 'documented', 'persuasive'],
    } as ToneMetadata,
    sections: [
      'introduction',
      'statement_of_facts',
      'coverage_analysis',
      'liability',
      'medical_chronology',
      'damages',
      'economic_damages',
      'policy_limits',
      'conclusion',
    ],
    isDefault: true,
  },
  {
    name: 'Employment Law',
    content: null,
    styleMetadata: {
      fonts: {
        heading: 'Times New Roman',
        body: 'Times New Roman',
      },
      spacing: {
        paragraph: 1.15,
        section: 2,
      },
      headers: {
        style: 'bold',
        size: 14,
      },
      lists: {
        style: 'bullet',
      },
    } as StyleMetadata,
    toneMetadata: {
      formality: 'formal',
      voice: 'Formal and authoritative',
      descriptors: ['legal', 'precise', 'comprehensive'],
    } as ToneMetadata,
    sections: [
      'introduction',
      'statement_of_facts',
      'liability',
      'violations',
      'damages',
      'economic_damages',
      'remedies',
      'conclusion',
    ],
    isDefault: true,
  },
  {
    name: 'Consumer Protection',
    content: null,
    styleMetadata: {
      fonts: {
        heading: 'Times New Roman',
        body: 'Times New Roman',
      },
      spacing: {
        paragraph: 1.15,
        section: 2,
      },
      headers: {
        style: 'both',
        size: 14,
      },
      lists: {
        style: 'bullet',
      },
    } as StyleMetadata,
    toneMetadata: {
      formality: 'professional',
      voice: 'Assertive and protective',
      descriptors: ['direct', 'protective', 'detailed'],
    } as ToneMetadata,
    sections: [
      'introduction',
      'statement_of_facts',
      'violations',
      'liability',
      'damages',
      'economic_damages',
      'statutory_damages',
      'conclusion',
    ],
    isDefault: true,
  },
  {
    name: 'Contractual Disputes',
    content: null,
    styleMetadata: {
      fonts: {
        heading: 'Times New Roman',
        body: 'Times New Roman',
      },
      spacing: {
        paragraph: 1.15,
        section: 2,
      },
      headers: {
        style: 'underline',
        size: 14,
      },
      lists: {
        style: 'numbered',
      },
    } as StyleMetadata,
    toneMetadata: {
      formality: 'formal',
      voice: 'Formal and precise',
      descriptors: ['legal', 'contractual', 'detailed'],
    } as ToneMetadata,
    sections: [
      'introduction',
      'contract_terms',
      'statement_of_facts',
      'breach_analysis',
      'liability',
      'damages',
      'economic_damages',
      'remedies',
      'conclusion',
    ],
    isDefault: true,
  },
  {
    name: 'Business & Commercial',
    content: null,
    styleMetadata: {
      fonts: {
        heading: 'Times New Roman',
        body: 'Times New Roman',
      },
      spacing: {
        paragraph: 1.15,
        section: 2,
      },
      headers: {
        style: 'bold',
        size: 14,
      },
      lists: {
        style: 'bullet',
      },
    } as StyleMetadata,
    toneMetadata: {
      formality: 'professional',
      voice: 'Business-like and direct',
      descriptors: ['professional', 'concise', 'authoritative'],
    } as ToneMetadata,
    sections: [
      'introduction',
      'statement_of_facts',
      'business_context',
      'liability',
      'damages',
      'economic_damages',
      'business_impact',
      'conclusion',
    ],
    isDefault: true,
  },
  {
    name: 'Family Law',
    content: null,
    styleMetadata: {
      fonts: {
        heading: 'Times New Roman',
        body: 'Times New Roman',
      },
      spacing: {
        paragraph: 1.15,
        section: 2,
      },
      headers: {
        style: 'both',
        size: 14,
      },
      lists: {
        style: 'bullet',
      },
    } as StyleMetadata,
    toneMetadata: {
      formality: 'professional',
      voice: 'Respectful and empathetic',
      descriptors: ['sensitive', 'detailed', 'professional'],
    } as ToneMetadata,
    sections: [
      'introduction',
      'statement_of_facts',
      'legal_basis',
      'circumstances',
      'damages',
      'economic_damages',
      'best_interests',
      'conclusion',
    ],
    isDefault: true,
  },
  {
    name: 'Estate & Probate',
    content: null,
    styleMetadata: {
      fonts: {
        heading: 'Times New Roman',
        body: 'Times New Roman',
      },
      spacing: {
        paragraph: 1.15,
        section: 2,
      },
      headers: {
        style: 'underline',
        size: 14,
      },
      lists: {
        style: 'numbered',
      },
    } as StyleMetadata,
    toneMetadata: {
      formality: 'formal',
      voice: 'Formal and respectful',
      descriptors: ['legal', 'precise', 'respectful'],
    } as ToneMetadata,
    sections: [
      'introduction',
      'estate_context',
      'statement_of_facts',
      'legal_basis',
      'violations',
      'damages',
      'economic_damages',
      'remedies',
      'conclusion',
    ],
    isDefault: true,
  },
]

/**
 * Seed default templates into the database
 */
export async function seedTemplates(): Promise<void> {
  console.log('Seeding default templates...')

  for (const templateData of defaultTemplates) {
    const existing = await prisma.template.findFirst({
      where: {
        name: templateData.name,
        isDefault: true,
      },
    })

    if (!existing) {
      await prisma.template.create({
        data: {
          name: templateData.name,
          content: templateData.content,
          styleMetadata: templateData.styleMetadata as any,
          toneMetadata: templateData.toneMetadata as any,
          isDefault: templateData.isDefault,
        },
      })
      console.log(`✓ Created template: ${templateData.name}`)
    } else {
      console.log(`- Template already exists: ${templateData.name}`)
    }
  }

  console.log('Template seeding complete!')
}

/**
 * Check if templates need seeding
 */
export async function needsSeeding(): Promise<boolean> {
  const count = await prisma.template.count({
    where: { isDefault: true },
  })
  return count < defaultTemplates.length
}

