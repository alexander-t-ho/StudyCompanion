import React from 'react'
import { InlineMath, BlockMath } from 'react-katex'
import 'katex/dist/katex.min.css'

/**
 * Renders text with LaTeX math notation
 * Supports both inline \( ... \) and block \[ ... \] math
 */
export function MathRenderer({ text, block = false }) {
  if (!text) return null

  // Split text by LaTeX delimiters
  const parts = []
  let textToProcess = text

  // Handle block math \[ ... \]
  const blockMathRegex = /\\\[([\s\S]*?)\\\]/g
  let blockMatch
  let lastIndex = 0

  while ((blockMatch = blockMathRegex.exec(textToProcess)) !== null) {
    // Add text before the math
    if (blockMatch.index > lastIndex) {
      const textBefore = textToProcess.substring(lastIndex, blockMatch.index)
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore })
      }
    }
    // Add the math block
    parts.push({ type: 'block-math', content: blockMatch[1] })
    lastIndex = blockMathRegex.lastIndex
  }

  // Add remaining text after last block math
  if (lastIndex < textToProcess.length) {
    const remainingText = textToProcess.substring(lastIndex)
    if (remainingText) {
      // Process inline math in remaining text
      const inlineParts = processInlineMath(remainingText)
      parts.push(...inlineParts)
    }
  } else if (parts.length === 0) {
    // No block math found, process entire text for inline math
    parts.push(...processInlineMath(textToProcess))
  }

  if (parts.length === 0) {
    return <span>{text}</span>
  }

  return (
    <span>
      {parts.map((part, index) => {
        if (part.type === 'block-math') {
          return <BlockMath key={index} math={part.content} />
        } else if (part.type === 'inline-math') {
          return <InlineMath key={index} math={part.content} />
        } else {
          return <span key={index}>{part.content}</span>
        }
      })}
    </span>
  )
}

function processInlineMath(text) {
  const parts = []
  const inlineMathRegex = /\\\(([\s\S]*?)\\\)/g
  let lastIndex = 0
  let match

  while ((match = inlineMathRegex.exec(text)) !== null) {
    // Add text before the math
    if (match.index > lastIndex) {
      const textBefore = text.substring(lastIndex, match.index)
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore })
      }
    }
    // Add the inline math
    parts.push({ type: 'inline-math', content: match[1] })
    lastIndex = inlineMathRegex.lastIndex
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex)
    if (remainingText) {
      parts.push({ type: 'text', content: remainingText })
    }
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }]
}

export default MathRenderer

