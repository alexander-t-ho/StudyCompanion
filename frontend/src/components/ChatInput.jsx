import React, { useState, useRef, useEffect } from 'react'
import './ChatInput.css'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_IMAGES = 3

function ChatInput({ onSend, disabled, placeholder = "Type your message..." }) {
  const [message, setMessage] = useState('')
  const [images, setImages] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const dropZoneRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleFileSelect = async (files) => {
    const fileArray = Array.from(files)
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length === 0) {
      alert('Please select image files only')
      return
    }

    if (images.length + imageFiles.length > MAX_IMAGES) {
      alert(`You can only upload up to ${MAX_IMAGES} images`)
      return
    }

    const validImages = []
    for (const file of imageFiles) {
      if (file.size > MAX_IMAGE_SIZE) {
        alert(`Image ${file.name} is too large. Maximum size is 5MB`)
        continue
      }
      
      try {
        const base64 = await convertToBase64(file)
        validImages.push({
          file,
          base64,
          preview: URL.createObjectURL(file)
        })
      } catch (error) {
        console.error('Error converting image:', error)
        alert(`Error processing image ${file.name}`)
      }
    }

    setImages(prev => [...prev, ...validImages])
  }

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files)
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const removeImage = (index) => {
    setImages(prev => {
      const newImages = prev.filter((_, i) => i !== index)
      // Revoke object URL to free memory
      URL.revokeObjectURL(prev[index].preview)
      return newImages
    })
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if ((message.trim() || images.length > 0) && !disabled) {
      const imageBase64s = images.map(img => img.base64)
      onSend(message.trim(), imageBase64s)
      setMessage('')
      // Clean up object URLs
      images.forEach(img => URL.revokeObjectURL(img.preview))
      setImages([])
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div 
      ref={dropZoneRef}
      className={`chat-input-wrapper ${isDragging ? 'dragging' : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {images.length > 0 && (
        <div className="image-preview-container">
          {images.map((img, index) => (
            <div key={index} className="image-preview">
              <img src={img.preview} alt={`Preview ${index + 1}`} />
              <button
                type="button"
                className="remove-image-button"
                onClick={() => removeImage(index)}
                aria-label="Remove image"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="chat-input-form">
        <div className="chat-input-container">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || images.length >= MAX_IMAGES}
            className="chat-image-button"
            aria-label="Upload image"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="chat-input-textarea"
          />
          <button
            type="submit"
            disabled={disabled || (!message.trim() && images.length === 0)}
            className="chat-send-button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </form>
      {isDragging && (
        <div className="drag-overlay">
          <p>Drop images here</p>
        </div>
      )}
    </div>
  )
}

export default ChatInput


