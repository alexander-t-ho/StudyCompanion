import React from 'react'
import { MathRenderer } from './MathRenderer'
import './ChatMessage.css'

function ChatMessage({ message, role, timestamp, hasDiagram, diagramType, images = [] }) {
  const isUser = role === 'user'
  
  // Parse diagram requests in message
  const diagramMatch = message.match(/\[DIAGRAM: ([^\]]+)\]/)
  const displayMessage = message.replace(/\[DIAGRAM: [^\]]+\]/g, '').trim()
  const showDiagram = hasDiagram || !!diagramMatch
  const diagramTypeToShow = diagramType || (diagramMatch ? diagramMatch[1] : null)
  
  return (
    <div className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-content">
        {images && images.length > 0 && (
          <div className="message-images">
            {images.map((imageUrl, index) => (
              <img 
                key={index} 
                src={imageUrl} 
                alt={`Uploaded image ${index + 1}`}
                className="message-image"
              />
            ))}
          </div>
        )}
        {displayMessage && (
          <div className="message-text">
            <MathRenderer text={displayMessage} />
          </div>
        )}
        {showDiagram && diagramTypeToShow && (
          <div className="diagram-request">
            <div className="diagram-indicator">
              📊 Diagram: {diagramTypeToShow.replace(/_/g, ' ')}
            </div>
            <div className="diagram-placeholder">
              [Diagram would be displayed here: {diagramTypeToShow}]
            </div>
          </div>
        )}
        {timestamp && (
          <div className="message-timestamp">
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatMessage

