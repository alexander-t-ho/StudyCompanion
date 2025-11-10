import React, { useState, useEffect, useRef } from 'react'
import { TrashIcon } from '@radix-ui/react-icons'
import { aiCompanionApi } from '../services/aiCompanionApi'
import { studyNotesApi } from '../services/studyNotesApi'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import './AiCompanionChat.css'

function AiCompanionChat({ studentId, practiceProblemId = null, subject = null, apiKey, useOpenRouter, sessionId = null, sessionContext = null, onClose = null }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error, setError] = useState(null)
  const [handoffStatus, setHandoffStatus] = useState(null) // null, 'ready', 'initiated'
  const [handoffReadiness, setHandoffReadiness] = useState(null)
  const [strugglingDetected, setStrugglingDetected] = useState(null) // { concept: string, shown: boolean }
  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)

  useEffect(() => {
    loadConversationHistory()
  }, [studentId, practiceProblemId, subject, sessionId])

  // Reset handoff status if we're in a homework help conversation
  // (homework help should never trigger handoff)
  useEffect(() => {
    const hasImages = messages.some(m => m.images && m.images.length > 0)
    if (hasImages && handoffStatus === 'initiated') {
      setHandoffStatus(null)
    }
  }, [messages, handoffStatus])

  useEffect(() => {
    // Only scroll if history has loaded (not during initial load)
    if (!loadingHistory) {
      scrollToBottom()
    }
  }, [messages, loadingHistory])

  // Check for struggling patterns after messages update and show message
  useEffect(() => {
    const checkAndCreateStudyNote = async () => {
      if (messages.length > 0 && !loading) {
        const struggling = detectStruggling(messages)
        if (struggling) {
          // Check if we need to show the message
          const hasStrugglingMessage = messages.some(m => 
            m.isStrugglingMessage && 
            m.content && 
            m.content.includes(struggling.concept)
          )
          
          if (!hasStrugglingMessage && (!strugglingDetected || strugglingDetected.concept !== struggling.concept || !strugglingDetected.shown)) {
            const strugglingMessage = {
              role: 'assistant',
              content: `I have noticed you are having a little bit of trouble understanding ${struggling.concept}. I will place notes with your tutor for next session to focus on this.`,
              timestamp: new Date().toISOString(),
              isStrugglingMessage: true
            }
            
            setMessages(prev => [...prev, strugglingMessage])
            setStrugglingDetected({
              ...struggling,
              shown: true
            })

            // Create study note in backend
            try {
              await studyNotesApi.create({
                subject: subject || null,
                concept: struggling.concept,
                message: strugglingMessage.content,
                detected_at: new Date().toISOString()
              })
            } catch (err) {
              console.error('Failed to create study note:', err)
            }
          } else if (!strugglingDetected || strugglingDetected.concept !== struggling.concept) {
            setStrugglingDetected({
              ...struggling,
              shown: hasStrugglingMessage
            })
          }
        } else {
          setStrugglingDetected(null)
        }
      }
    }

    checkAndCreateStudyNote()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading])

  const scrollToBottom = () => {
    // Use setTimeout to ensure layout is stable before scrolling
    setTimeout(() => {
      if (chatContainerRef.current) {
        // Scroll the messages container, not the entire page
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
      } else if (messagesEndRef.current) {
        // Fallback: scroll into view but only if messages container exists
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }, 100)
  }

  // Detect consistent struggling patterns from conversation
  const detectStruggling = (messageList) => {
    if (!messageList || messageList.length < 3) return null

    // Get last 15 messages for analysis
    const recentMessages = messageList.slice(-15)
    const userMessages = recentMessages.filter(m => m.role === 'user')
    
    if (userMessages.length < 2) return null

    // Struggle indicators to look for
    const strugglePatterns = [
      /don'?t understand/i,
      /confused/i,
      /stuck/i,
      /can'?t solve/i,
      /don'?t know how/i,
      /help with/i,
      /struggling/i,
      /difficult/i,
      /hard/i,
      /wrong/i,
      /incorrect/i,
      /not working/i,
      /doesn'?t make sense/i,
      /unclear/i
    ]

    // Count struggle indicators
    let struggleCount = 0
    let strugglingMessages = []
    
    userMessages.forEach(msg => {
      const content = msg.content || ''
      const matches = strugglePatterns.filter(pattern => pattern.test(content))
      if (matches.length > 0) {
        struggleCount += matches.length
        strugglingMessages.push({
          content,
          matches: matches.length
        })
      }
    })

    // If 3+ struggle indicators found, extract the concept
    if (struggleCount >= 3) {
      // Try to extract the main concept/topic from struggling messages
      const allContent = strugglingMessages.map(m => m.content).join(' ')
      
      // Look for common patterns to extract concept
      // Pattern 1: "help with [concept]"
      let concept = allContent.match(/help with\s+([^.!?]+)/i)?.[1]?.trim()
      
      // Pattern 2: "don't understand [concept]"
      if (!concept) {
        concept = allContent.match(/don'?t understand\s+([^.!?]+)/i)?.[1]?.trim()
      }
      
      // Pattern 3: "struggling with [concept]"
      if (!concept) {
        concept = allContent.match(/struggling with\s+([^.!?]+)/i)?.[1]?.trim()
      }
      
      // Pattern 4: Look for subject-related keywords or capitalized words (likely concepts)
      if (!concept) {
        const capitalizedWords = allContent.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g)
        if (capitalizedWords && capitalizedWords.length > 0) {
          // Filter out common words and take the first meaningful one
          const commonWords = ['I', 'The', 'This', 'That', 'What', 'How', 'Why', 'When', 'Where']
          concept = capitalizedWords.find(word => !commonWords.includes(word)) || capitalizedWords[0]
        }
      }
      
      // Fallback: use a generic term
      if (!concept || concept.length < 3) {
        concept = 'this topic'
      }

      // Clean up the concept (remove common prefixes/suffixes)
      concept = concept.replace(/^(the|a|an|some|any)\s+/i, '').trim()
      if (concept.length > 50) {
        concept = concept.substring(0, 50) + '...'
      }

      return {
        concept,
        struggleCount,
        messageCount: strugglingMessages.length
      }
    }

    return null
  }

  const checkHandoffReadiness = async (context) => {
    if (!practiceProblemId) return // Only check for practice problems
    
    try {
      // Check routing status (this would need to be added to the API)
      // For now, we'll infer from message count
      const recentMessages = messages.filter(m => 
        m.role === 'user' && messages.indexOf(m) >= messages.length - 10
      )
      
      if (recentMessages.length >= 5) {
        setHandoffReadiness({
          ready: true,
          reason: 'Multiple interactions detected'
        })
      }
    } catch (err) {
      // Silently fail - this is optional
      console.error('Failed to check handoff readiness:', err)
    }
  }

  const handleRequestHumanTutor = async () => {
    try {
      setLoading(true)
      const context = {}
      if (practiceProblemId) {
        context.practice_problem_id = practiceProblemId
      }
      if (subject) {
        context.subject = subject
      }
      
      // Send explicit request message
      const response = await aiCompanionApi.sendMessage("I'd like to speak with a human tutor", context)
      
      const assistantMessage = {
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, assistantMessage])
      setHandoffStatus('initiated')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request human tutor')
    } finally {
      setLoading(false)
    }
  }

  const loadConversationHistory = async () => {
    try {
      setLoadingHistory(true)
      const response = await aiCompanionApi.getConversationHistory(practiceProblemId || null, subject || null, sessionId || null)
      const historyMessages = response.data.messages || []
      
      const mappedMessages = historyMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        images: msg.image_urls || [],
        timestamp: msg.created_at
      }))
      
      setMessages(mappedMessages)
    } catch (err) {
      console.error('Failed to load conversation history:', err)
      setError('Failed to load conversation history')
      // Don't show welcome message - let the AI respond naturally
      setMessages([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleDeleteConversation = async () => {
    if (!window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return
    }

    try {
      // Clear messages locally
      setMessages([])
      setStrugglingDetected(null)
      
      // TODO: Add API endpoint to delete conversation messages from backend
      // For now, we just clear the local state
      // await aiCompanionApi.deleteConversation(practiceProblemId || null, subject || null, sessionId || null)
    } catch (err) {
      console.error('Failed to delete conversation:', err)
      setError('Failed to delete conversation')
    }
  }

  const handleSendMessage = async (messageText, images = []) => {
    if (!messageText.trim() && images.length === 0) return
    if (loading) return // Prevent sending multiple messages at once

    // Add user message immediately with images
    const userMessage = {
      role: 'user',
      content: messageText,
      images: images,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMessage])
    setLoading(true)
    setError(null)

    try {
      const context = {}
      if (practiceProblemId) {
        context.practice_problem_id = practiceProblemId
      }
      if (subject) {
        context.subject = subject
      }
      if (sessionId) {
        context.session_id = sessionId
      }
      if (sessionContext) {
        context.session_context = sessionContext
      }
      // Mark as homework help if images are present OR if previous messages had images
      // This ensures homework help context is maintained throughout the conversation
      const hasImagesInConversation = images.length > 0 || messages.some(m => m.images && m.images.length > 0)
      if (hasImagesInConversation) {
        context.is_homework_help = true
      }
      const response = await aiCompanionApi.sendMessage(messageText, context, images, apiKey, useOpenRouter)
      
      // Parse response for diagram requests and handoff status
      let messageContent = response.data.message
      const diagramMatch = messageContent.match(/\[DIAGRAM: ([^\]]+)\]/)
      const hasDiagram = !!diagramMatch
      const diagramType = diagramMatch ? diagramMatch[1] : null
      
      // Remove diagram marker from display text
      messageContent = messageContent.replace(/\[DIAGRAM: [^\]]+\]/g, '').trim()
      
      // Check if handoff was triggered (from response or message content)
      // BUT: For homework help, never set handoff status - student should continue chatting with AI
      const isHomeworkHelp = hasImagesInConversation
      const handoffInfo = response.data.handoff
      const isHandoffAcknowledgment = handoffInfo?.triggered || 
                                      messageContent.toLowerCase().includes('connecting you with a human tutor') || 
                                      messageContent.toLowerCase().includes('connect you with a real tutor')
      
      // Only set handoff status if NOT homework help
      if (isHandoffAcknowledgment && !isHomeworkHelp) {
        setHandoffStatus('initiated')
      }
      
      const assistantMessage = {
        role: 'assistant',
        content: messageContent,
        timestamp: new Date().toISOString(),
        hasDiagram: hasDiagram,
        diagramType: diagramType
      }
      setMessages(prev => [...prev, assistantMessage])
      
      // Check handoff readiness after message (but not for homework help)
      if (!isHomeworkHelp) {
        checkHandoffReadiness(context)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message')
      console.error('Error sending message:', err)
      // Remove user message on error
      setMessages(prev => prev.slice(0, -1))
    } finally {
      // Always reset loading state, even on error
      setLoading(false)
    }
  }

  if (loadingHistory) {
    return (
      <div className="ai-companion-chat loading">
        <div>Loading conversation...</div>
      </div>
    )
  }

  return (
    <div className="ai-companion-chat">
      <div className="chat-header">
        <h3>AI Study Companion</h3>
        <div className="chat-header-right">
          <div className="chat-badges">
            {subject && (
              <span className="subject-context-badge">{subject}</span>
            )}
            {practiceProblemId && (
              <span className="practice-context-badge">Practice Problem Help</span>
            )}
            {handoffStatus === 'initiated' && (
              <span className="handoff-status-badge initiated">Connecting to Human Tutor...</span>
            )}
            {handoffReadiness?.ready && handoffStatus !== 'initiated' && (
              <span className="handoff-status-badge ready">Human Tutor Available</span>
            )}
          </div>
          <div className="chat-header-actions">
            <button 
              className="chat-delete-button"
              onClick={handleDeleteConversation}
              aria-label="Delete conversation"
              title="Delete conversation"
            >
              <TrashIcon />
            </button>
            {onClose && (
              <button 
                className="chat-close-button"
                onClick={onClose}
                aria-label="Close chat"
                title="Close"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="chat-messages" ref={chatContainerRef}>
        {messages.length === 0 && !loading && (
          <div className="empty-chat-state">
            <p>Start a conversation by typing a message below.</p>
          </div>
        )}
        {messages.map((message, idx) => (
          <ChatMessage
            key={idx}
            message={message.content}
            role={message.role}
            timestamp={message.timestamp}
            hasDiagram={message.hasDiagram}
            diagramType={message.diagramType}
            images={message.images || []}
          />
        ))}
        {loading && (
          <div className="chat-message assistant">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="chat-error">
          {error}
        </div>
      )}

      {handoffReadiness?.ready && handoffStatus !== 'initiated' && practiceProblemId && (
        <div className="handoff-suggestion">
          <p>Need more help? A human tutor is available.</p>
          <button 
            className="request-tutor-button"
            onClick={handleRequestHumanTutor}
            disabled={loading}
          >
            Request Human Tutor
          </button>
        </div>
      )}

      <div className="chat-input-container-wrapper">
        <ChatInput
          onSend={handleSendMessage}
          disabled={loading || handoffStatus === 'initiated'}
          placeholder={
            handoffStatus === 'initiated' 
              ? "Connecting to human tutor..." 
              : practiceProblemId 
                ? "Ask for help with this problem (I'll guide you, not give the answer)..." 
                : sessionContext
                  ? "Ask questions about this session..."
                  : "Type your message..."
          }
        />
      </div>
    </div>
  )
}

export default AiCompanionChat

