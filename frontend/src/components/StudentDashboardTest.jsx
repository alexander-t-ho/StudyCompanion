import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BentoGrid, BentoCard } from './ui/BentoGrid'
import { Calendar } from './ui/Calendar'
import { FileTextIcon, InputIcon, GlobeIcon, CalendarIcon, BellIcon, BarChartIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import { studentDashboardApi } from '../services/studentDashboardApi'
import { transcriptsAPI } from '../services/api'
import PracticeProblemList from './PracticeProblemList'
import AiCompanionChat from './AiCompanionChat'
import LongTermGoalsView from './LongTermGoalsView'
import ShortTermGoalCard from './ShortTermGoalCard'
import AllSessionsView from './AllSessionsView'
import { goalsApi } from '../services/goalsApi'
import EnhancedSessionBookingModal from './EnhancedSessionBookingModal'
import { authApi } from '../services/authApi'
import { sessionsApi } from '../services/sessionsApi'
import './StudentDashboardTest.css'

const StudentDashboardTest = ({ studentId: propStudentId }) => {
  const { subjectName, section } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Get current user for display
  const [currentUserState, setCurrentUserState] = useState(null)
  const [studentId, setStudentId] = useState(propStudentId || null)
  
  // Update studentId when currentUser is available (run once on mount and when propStudentId changes)
  useEffect(() => {
    let isMounted = true
    
    // Function to check and set studentId
    const checkAndSetStudentId = () => {
      const currentUser = authApi.getCurrentUser()
      setCurrentUserState(currentUser)
      
      if (propStudentId) {
        if (isMounted) {
          setStudentId(propStudentId)
        }
      } else if (currentUser?.id) {
        if (isMounted) {
          setStudentId(currentUser.id)
        }
      } else {
        // If no studentId and no currentUser, set error immediately
        if (isMounted) {
          setLoadingSubjects(false)
          setSubjectsError('Unable to load student information. Please log in again.')
        }
      }
    }
    
    // Check immediately - localStorage is synchronous, no delay needed
    checkAndSetStudentId()
    
    return () => {
      isMounted = false
    }
  }, [propStudentId]) // Only depend on propStudentId to avoid infinite loops
  
  const [selectedObject, setSelectedObject] = useState(null)
  const [hoveredObject, setHoveredObject] = useState(null)
  const [activeTab, setActiveTab] = useState(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [explodingObject, setExplodingObject] = useState(null)
  const [clickedIconPosition, setClickedIconPosition] = useState(null)
  const [selectedBentoCard, setSelectedBentoCard] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [selectedTranscript, setSelectedTranscript] = useState(null)
  const [loadingTranscript, setLoadingTranscript] = useState(false)
  const [viewMode, setViewMode] = useState('calendar') // 'calendar' or 'list'
  const [subjectDetail, setSubjectDetail] = useState(null)
  const [loadingSubjectDetail, setLoadingSubjectDetail] = useState(false)
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [selectedSection, setSelectedSection] = useState(null)
  const [sectionClickPosition, setSectionClickPosition] = useState(null)
  const [studentSubjects, setStudentSubjects] = useState([])
  // Start with loading false if we don't have studentId yet - will be set to true when we actually start loading
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [subjectsError, setSubjectsError] = useState(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [draggingObject, setDraggingObject] = useState(null)
  const [dragStartPos, setDragStartPos] = useState(null)
  const [longPressTimer, setLongPressTimer] = useState(null)
  const hasDraggedRef = useRef(false)
  const userMenuRef = useRef(null)
  const iconRefs = useRef({})
  
  // Store viewport dimensions once on mount to prevent recalculation
  const viewportRef = useRef({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080
  })

  // Helper function to get icon for subject
  const getSubjectIcon = (subjectName) => {
    const name = subjectName.toLowerCase()
    if (name.includes('calculus') || name.includes('math')) return '📊'
    if (name.includes('physics')) return '⚛️'
    if (name.includes('statistics') || name.includes('stats')) return '📈'
    if (name.includes('sat')) return '🎯'
    if (name.includes('chemistry')) return '🧪'
    if (name.includes('biology')) return '🔬'
    if (name.includes('english') || name.includes('literature')) return '📚'
    if (name.includes('history')) return '📜'
    if (name.includes('computer') || name.includes('cs')) return '💻'
    return '📖' // Default icon
  }

  // Load subjects from API
  const loadSubjects = useCallback(async (abortSignal) => {
    if (!studentId) {
      setLoadingSubjects(false)
      setSubjectsError('Student ID not available. Please log in again.')
      return // Don't load if studentId is not available
    }
    
    try {
      setLoadingSubjects(true)
      setSubjectsError(null)
      const response = await studentDashboardApi.getDashboard(studentId)
      
      // Check if operation was aborted
      if (abortSignal?.aborted) {
        return
      }
      
      const subjects = response.data.subjects || []
      
      // Map API response to component format
      const mappedSubjects = subjects.map((item, index) => ({
        id: index + 1,
        name: item.subject,
        progress: Math.round(item.mastery?.percentage || 0),
        icon: getSubjectIcon(item.subject)
      }))
      
      setStudentSubjects(mappedSubjects)
    } catch (err) {
      // Don't update state if operation was aborted
      if (abortSignal?.aborted) {
        return
      }
      console.error('[StudentDashboard] Failed to load subjects:', err)
      setSubjectsError('Failed to load subjects: ' + (err.response?.data?.error || err.message))
      // Fallback to empty array on error
      setStudentSubjects([])
    } finally {
      if (!abortSignal?.aborted) {
        setLoadingSubjects(false)
      }
    }
  }, [studentId])

  // Load subjects from API on mount or when studentId changes
  useEffect(() => {
    let abortController = new AbortController()
    
    if (studentId) {
      loadSubjects(abortController.signal)
    } else {
      // If no studentId after a brief delay, stop loading
      const timer = setTimeout(() => {
        if (!studentId) {
          setLoadingSubjects(false)
          setSubjectsError('Unable to load student information. Please log in again.')
        }
      }, 1000)
      
      return () => {
        clearTimeout(timer)
        abortController.abort()
      }
    }
    
    return () => {
      abortController.abort()
    }
  }, [studentId, loadSubjects])

  // Color palette for subjects (defined early for use in URL sync)
  const colorPalette = [
    '#6366f1', // Indigo/blue
    '#ec4899', // Hot pink/magenta
    '#f59e0b', // Yellow/orange
    '#10b981', // Green
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#ef4444', // Red
    '#14b8a6'  // Teal
  ]

  // Helper function to convert subject name to URL slug
  const subjectNameToSlug = (name) => {
    return name.toLowerCase().replace(/\s+/g, '-')
  }

  // Helper function to convert URL slug to subject name
  const slugToSubjectName = (slug) => {
    return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  // Sync explodingObject with URL params
  useEffect(() => {
    if (subjectName && studentSubjects.length > 0) {
      const normalizedSubjectName = slugToSubjectName(subjectName)
      const subject = studentSubjects.find(s => 
        s.name.toLowerCase() === normalizedSubjectName.toLowerCase() ||
        subjectNameToSlug(s.name) === subjectName.toLowerCase()
      )
      if (subject) {
        // Only set if it's different from current explodingObject
        const currentSubjectName = explodingObject?.subtitle
        if (currentSubjectName !== subject.name) {
          const subjectIndex = studentSubjects.findIndex(s => s.id === subject.id)
          const object = {
            id: subject.id,
            title: subject.name.split(' ').slice(0, -1).join(' '),
            subtitle: subject.name,
            progress: subject.progress,
            color: colorPalette[subjectIndex % colorPalette.length],
            icon: subject.icon
          }
          setExplodingObject(object)
          // Don't set clickedIconPosition here to avoid animation on page load
        }
      }
    } else if (!subjectName && location.pathname === '/main' && explodingObject) {
      // If we're on /main but have an explodingObject, clear it
      setExplodingObject(null)
      setSelectedSection(null)
    }
  }, [subjectName, studentSubjects, location.pathname, explodingObject?.subtitle])

  // Sync selectedSection with URL params
  useEffect(() => {
    if (section && explodingObject) {
      // Map URL section names to internal section names
      const sectionMap = {
        'practice': 'practice',
        'goals': 'goals',
        'sessions': 'study-sessions',
        'upcoming-sessions': 'upcoming-sessions',
        'ask-ai': 'ask-ai',
        'progress': 'progress'
      }
      const mappedSection = sectionMap[section] || section
      if (mappedSection !== selectedSection) {
        setSelectedSection(mappedSection)
      }
    } else if (!section && selectedSection && explodingObject) {
      // If URL doesn't have section but we have selectedSection, clear it
      setSelectedSection(null)
    }
  }, [section, explodingObject, selectedSection])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  // Helper to convert hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result 
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '99, 102, 241'
  }

  // Generate floating objects dynamically from student subjects
  // Inverse sizing: lower progress = larger object
  const getSizeFromProgress = (progress) => {
    if (progress < 60) return 'large'   // Needs most focus
    if (progress < 75) return 'medium'  // Needs some focus
    return 'small'                       // Doing well
  }

  const getSizeDimensions = (progress) => {
    // Inverse relationship: lower progress = larger size
    if (progress < 60) return { width: 300, height: 340 }  // Large
    if (progress < 75) return { width: 240, height: 280 }  // Medium
    return { width: 200, height: 240 }                     // Small
  }

  // Generate positions dynamically - ensure no overlap using bounding box collision detection
  const generatePositions = (subjects, viewport) => {
    const positions = []
    const padding = 20 // Minimum padding between objects in pixels
    
    // Use stored viewport dimensions to ensure consistency
    const viewportWidth = viewport.width
    const viewportHeight = viewport.height
    
    // Helper to generate a random number with normal distribution (centered)
    const randomCentered = (center, spread) => {
      // Box-Muller transform for normal distribution
      const u1 = Math.random()
      const u2 = Math.random()
      const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      // Scale and center the distribution
      return center + (z0 * spread)
    }
    
    // Helper to check if two bounding boxes overlap
    const boxesOverlap = (box1, box2) => {
      // Check if boxes overlap (with padding)
      return !(
        box1.right + padding < box2.left ||
        box1.left > box2.right + padding ||
        box1.bottom + padding < box2.top ||
        box1.top > box2.bottom + padding
      )
    }
    
    // Helper to check if a position is valid (no overlap and within bounds)
    const isValidPosition = (x, y, width, height, existingBoxes) => {
      // Convert percentage to pixels
      const centerX = (x / 100) * viewportWidth
      const centerY = (y / 100) * viewportHeight
      
      // Calculate bounding box (object is centered on x, y)
      const left = centerX - width / 2
      const right = centerX + width / 2
      const top = centerY - height / 2
      const bottom = centerY + height / 2
      
      const newBox = { left, right, top, bottom, width, height }
      
      // Check if within viewport bounds (with margin)
      const margin = 20
      const headerSpace = 120 // Space for header at top
      const bottomSpace = 200 // Space for bottom icons
      if (left < margin || right > viewportWidth - margin) return false
      if (top < headerSpace || bottom > viewportHeight - bottomSpace) return false // Leave space for header and bottom icons
      
      // Check if overlaps with any existing box
      return !existingBoxes.some(existingBox => boxesOverlap(newBox, existingBox))
    }
    
    // Center of the viewport (tighter clustering for all aspect ratios)
    const centerX = 50 // 50% horizontal center
    const centerY = 45 // 45% vertical (moved lower to avoid header and ensure visibility)
    const spreadX = 25 // Reduced spread horizontally to keep closer to center
    const spreadY = 20 // Reduced spread vertically to keep closer to center
    
    // Generate positions with proper collision detection
    for (let i = 0; i < subjects.length; i++) {
      const subject = subjects[i]
      const size = getSizeDimensions(subject.progress)
      const existingBoxes = []
      
      // Convert existing positions to bounding boxes
      for (let j = 0; j < positions.length; j++) {
        const pos = positions[j]
        const existingSubject = subjects[j]
        const existingSize = getSizeDimensions(existingSubject.progress)
        const centerX_px = (pos.x / 100) * viewportWidth
        const centerY_px = (pos.y / 100) * viewportHeight
        
        existingBoxes.push({
          left: centerX_px - existingSize.width / 2,
          right: centerX_px + existingSize.width / 2,
          top: centerY_px - existingSize.height / 2,
          bottom: centerY_px + existingSize.height / 2,
          width: existingSize.width,
          height: existingSize.height
        })
      }
      
      let attempts = 0
      let newPos
      let found = false
      
      do {
        // Use normal distribution centered around viewport center
        let x = randomCentered(centerX, spreadX)
        let y = randomCentered(centerY, spreadY)
        
        // Clamp to viewport bounds (tighter bounds to keep centered, moved lower)
        x = Math.max(15, Math.min(85, x))
        y = Math.max(20, Math.min(65, y)) // Start at 20% to leave space for header, end at 65% to avoid bottom icons
        
        // Check if this position is valid (no overlap)
        if (isValidPosition(x, y, size.width, size.height, existingBoxes)) {
          newPos = { x, y }
          found = true
        }
        
        attempts++
      } while (!found && attempts < 300)
      
      if (found) {
        positions.push(newPos)
      } else {
        // Fallback: try a grid-based approach if random fails
        const cols = Math.ceil(Math.sqrt(subjects.length))
        const col = i % cols
        const row = Math.floor(i / cols)
        const spacingX = 60 / cols
        const spacingY = 40 / Math.ceil(subjects.length / cols)
        positions.push({
          x: 20 + (col * spacingX),
          y: 15 + (row * spacingY)
        })
      }
    }
    
    return positions
  }

  // Load saved positions from localStorage
  const loadSavedPositions = () => {
    try {
      const saved = localStorage.getItem(`subject_positions_${studentId}`)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (err) {
      console.error('Failed to load saved positions:', err)
    }
    return null
  }

  // Save positions to localStorage
  const savePositions = (newPositions) => {
    try {
      const positionsMap = {}
      studentSubjects.forEach((subject, index) => {
        if (newPositions[index]) {
          positionsMap[subject.id] = newPositions[index]
        }
      })
      localStorage.setItem(`subject_positions_${studentId}`, JSON.stringify(positionsMap))
    } catch (err) {
      console.error('Failed to save positions:', err)
    }
  }

  // Store positions in a ref to ensure they persist across renders
  const positionsRef = useRef(null)
  const lastSubjectsKeyRef = useRef(null)
  
  // Create a stable key based on subject IDs and progress
  const subjectsKey = useMemo(() => {
    return studentSubjects.map(s => `${s.id}-${s.progress}`).join(',')
  }, [studentSubjects])
  
  // Load saved positions or generate new ones
  if (positionsRef.current === null || lastSubjectsKeyRef.current !== subjectsKey) {
    const savedPositions = loadSavedPositions()
    const generatedPositions = generatePositions(studentSubjects, viewportRef.current)
    
    // Use saved positions if available, otherwise use generated
    if (savedPositions) {
      positionsRef.current = studentSubjects.map((subject, index) => {
        const saved = savedPositions[subject.id]
        return saved || generatedPositions[index]
      })
    } else {
      positionsRef.current = generatedPositions
    }
    
    lastSubjectsKeyRef.current = subjectsKey
  }
  
  const positions = positionsRef.current

  // Use state for floating objects to allow updates during dragging
  const [floatingObjects, setFloatingObjects] = useState(() => {
    return studentSubjects.map((subject, index) => ({
      id: subject.id,
      title: subject.name.split(' ').slice(0, -1).join(' '), // Remove last word (e.g., "BC", "C")
      subtitle: subject.name,
      progress: subject.progress,
      color: colorPalette[index % colorPalette.length],
      position: positions[index] || { x: 50, y: 50 },
      size: getSizeFromProgress(subject.progress),
      icon: subject.icon
    }))
  })

  // Update floating objects when positions or subjects change
  useEffect(() => {
    setFloatingObjects(prev => {
      return studentSubjects.map((subject, index) => {
        const existing = prev.find(obj => obj.id === subject.id)
        return {
          id: subject.id,
          title: subject.name.split(' ').slice(0, -1).join(' '),
          subtitle: subject.name,
          progress: subject.progress,
          color: colorPalette[index % colorPalette.length],
          position: positions[index] || existing?.position || { x: 50, y: 50 },
          size: getSizeFromProgress(subject.progress),
          icon: subject.icon
        }
      })
    })
  }, [studentSubjects, positions])

  // Create subject color mapping for calendar
  const subjectColorMap = useMemo(() => {
    const colorMap = {}
    studentSubjects.forEach((subject, index) => {
      colorMap[subject.name] = colorPalette[index % colorPalette.length]
    })
    return colorMap
  }, [studentSubjects])

  // Bottom row icon items
  const bottomIcons = [
    { id: 'goals', label: 'Goals', icon: '🎯' },
    { id: 'sessions', label: 'Calendar', icon: '📚' },
    { id: 'practice', label: 'Homework Help', icon: '💬' }
  ]

  // Handle long press to start dragging
  const handleLongPressStart = (object, event) => {
    // Reset drag flag
    hasDraggedRef.current = false
    
    // Clear any existing timer
    if (longPressTimer) {
      clearTimeout(longPressTimer)
    }

    const timer = setTimeout(() => {
      // Start dragging
      const touch = event.touches ? event.touches[0] : { clientX: event.clientX, clientY: event.clientY }
      setDraggingObject(object.id)
      setDragStartPos({
        x: touch.clientX,
        y: touch.clientY,
        initialX: object.position.x,
        initialY: object.position.y
      })
      setLongPressTimer(null)
    }, 500) // 500ms for long press

    setLongPressTimer(timer)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
    // If we didn't start dragging, reset the drag flag immediately
    if (!draggingObject) {
      hasDraggedRef.current = false
    }
  }

  // Handle drag movement
  const handleDragMove = useCallback((event) => {
    if (!draggingObject || !dragStartPos) return

    const touch = event.touches ? event.touches[0] : { clientX: event.clientX, clientY: event.clientY }
    const deltaX = touch.clientX - dragStartPos.x
    const deltaY = touch.clientY - dragStartPos.y

    // Mark that a drag has occurred if movement is significant
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      hasDraggedRef.current = true
    }

    // Convert pixel delta to percentage
    const deltaXPercent = (deltaX / viewportRef.current.width) * 100
    const deltaYPercent = (deltaY / viewportRef.current.height) * 100

    // Calculate new position
    let newX = dragStartPos.initialX + deltaXPercent
    let newY = dragStartPos.initialY + deltaYPercent

    // Clamp to viewport bounds
    newX = Math.max(5, Math.min(95, newX))
    newY = Math.max(10, Math.min(80, newY))

    // Update position for this object
    setFloatingObjects(prev => {
      const objectIndex = prev.findIndex(obj => obj.id === draggingObject)
      if (objectIndex !== -1) {
        const updated = [...prev]
        updated[objectIndex] = {
          ...updated[objectIndex],
          position: { x: newX, y: newY }
        }
        // Also update positionsRef
        const newPositions = [...positionsRef.current]
        newPositions[objectIndex] = { x: newX, y: newY }
        positionsRef.current = newPositions
        return updated
      }
      return prev
    })
  }, [draggingObject, dragStartPos])

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (draggingObject) {
      // Save positions from current ref
      const currentPositions = positionsRef.current
      if (currentPositions) {
        savePositions(currentPositions)
      }
      const wasDragging = hasDraggedRef.current
      setDraggingObject(null)
      setDragStartPos(null)
      // Reset drag flag after a short delay to allow click handler to check it
      // Only reset if we actually dragged (not just a long press without movement)
      if (wasDragging) {
        setTimeout(() => {
          hasDraggedRef.current = false
        }, 200)
      } else {
        hasDraggedRef.current = false
      }
    }
    handleLongPressEnd()
  }, [draggingObject])

  // Set up global drag handlers
  useEffect(() => {
    if (draggingObject) {
      const handleMouseMove = (e) => handleDragMove(e)
      const handleMouseUp = () => handleDragEnd()
      const handleTouchMove = (e) => {
        e.preventDefault()
        handleDragMove(e)
      }
      const handleTouchEnd = () => handleDragEnd()

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('touchend', handleTouchEnd)

      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
        window.removeEventListener('touchmove', handleTouchMove)
        window.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [draggingObject, dragStartPos, handleDragMove, handleDragEnd])

  const handleObjectClick = (object, event) => {
    // Don't trigger click if we're currently dragging or just finished dragging
    if (draggingObject || hasDraggedRef.current) {
      return
    }

    // Get the icon's position and dimensions
    const iconElement = event.currentTarget
    const rect = iconElement.getBoundingClientRect()
    
    setClickedIconPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height
    })
    
    // Update URL
    const subjectSlug = subjectNameToSlug(object.subtitle)
    navigate(`/subject/${subjectSlug}`, { replace: false })
    
    // Trigger explode animation
    setExplodingObject(object)
    setSelectedObject(null) // Close modal if open
    setSelectedSection(null) // Reset to landing page when switching subjects
  }

  const handleBackToDashboard = () => {
    navigate('/main', { replace: false })
    setExplodingObject(null)
    setClickedIconPosition(null)
    setSelectedSection(null)
  }

  const handleCloseDetail = () => {
    setSelectedObject(null)
  }

  // Bento Grid features for the exploded page
  const getBentoFeatures = (subject) => {
    const baseFeatures = [
      {
        Icon: FileTextIcon,
        name: "Study Sessions",
        description: "Review your past tutoring sessions and track your learning progress.",
        href: "#",
        cta: "View Sessions",
        background: <img src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=400&fit=crop" alt="" />,
        className: "lg-row-start-1 lg-row-end-4 lg-col-start-2 lg-col-end-3",
      },
      {
        Icon: InputIcon,
        name: "Practice Problems",
        description: "Test your understanding with practice problems tailored to your level.",
        href: "#",
        cta: "Start Practicing",
        background: <img src="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=400&fit=crop" alt="" />,
        className: "lg-col-start-1 lg-col-end-2 lg-row-start-1 lg-row-end-3",
      },
      {
        Icon: GlobeIcon,
        name: "Learning Resources",
        description: "Access curated resources and materials for deeper understanding.",
        href: "#",
        cta: "Explore Resources",
        background: <img src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=400&fit=crop" alt="" />,
        className: "lg-col-start-1 lg-col-end-2 lg-row-start-3 lg-row-end-4",
      },
      {
        Icon: CalendarIcon,
        name: "Upcoming Sessions",
        description: "Schedule and manage your next tutoring sessions.",
        href: "#",
        cta: "Book Session",
        background: <img src="https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=400&h=400&fit=crop" alt="" />,
        className: "lg-col-start-3 lg-col-end-3 lg-row-start-1 lg-row-end-2",
      },
      {
        Icon: BarChartIcon,
        name: "Progress Analytics",
        description: "View detailed analytics and insights about your learning journey.",
        href: "#",
        cta: "View Analytics",
        background: <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop" alt="" />,
        className: "lg-col-start-3 lg-col-end-3 lg-row-start-2 lg-row-end-4",
      },
    ]
    return baseFeatures
  }

  // Load subject detail when a subject is clicked
  useEffect(() => {
    if (explodingObject) {
      loadSubjectDetail()
    }
  }, [explodingObject])

  const loadSubjectDetail = async () => {
    if (!explodingObject) return
    
    try {
      setLoadingSubjectDetail(true)
      const response = await studentDashboardApi.getSubjectDetail(studentId, explodingObject.subtitle)
      if (response.data) {
        setSubjectDetail(response.data)
        if (response.data.sessions) {
          setSessions(response.data.sessions)
          // Filter upcoming sessions (future dates)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const upcoming = response.data.sessions.filter(session => {
            if (!session.date) return false
            const sessionDate = new Date(session.date)
            sessionDate.setHours(0, 0, 0, 0)
            return sessionDate >= today
          }).sort((a, b) => {
            const dateA = new Date(a.date)
            const dateB = new Date(b.date)
            return dateA - dateB
          })
          setUpcomingSessions(upcoming.slice(0, 5)) // Show next 5 upcoming sessions
        }
      }
    } catch (error) {
      console.error('Failed to load subject detail:', error)
      setSubjectDetail(null)
      setSessions([])
      setUpcomingSessions([])
    } finally {
      setLoadingSubjectDetail(false)
    }
  }

  const handleBentoCardClick = (cardName, href) => {
    if (cardName === 'Study Sessions') {
      setSelectedBentoCard('Study Sessions')
      // Load sessions if not already loaded
      if (sessions.length === 0) {
        loadSessions()
      }
    } else if (href && href !== '#') {
      // Handle other card clicks
      window.location.href = href
    }
  }

  const handleCalendarDayClick = async (date) => {
    // Find sessions for the clicked date
    // Use the same date format as Calendar component: year-month-day (month is 0-indexed)
    const clickedYear = date.getFullYear()
    const clickedMonth = date.getMonth() // 0-indexed
    const clickedDay = date.getDate()
    const clickedDateKey = `${clickedYear}-${clickedMonth}-${clickedDay}`
    
    const daySessions = sessions.filter(session => {
      if (!session.date) return false
      const sessionDate = new Date(session.date)
      const sessionYear = sessionDate.getFullYear()
      const sessionMonth = sessionDate.getMonth() // 0-indexed
      const sessionDay = sessionDate.getDate()
      const sessionDateKey = `${sessionYear}-${sessionMonth}-${sessionDay}`
      return sessionDateKey === clickedDateKey
    })
    
    if (daySessions.length > 0) {
      // Use the first session (or you could show a list if multiple)
      const session = daySessions[0]
      handleSessionClick(session)
    }
  }

  const handleSessionClick = async (session) => {
    setSelectedSession(session)
    
    // Fetch the full transcript
    if (session.transcript_id) {
      try {
        setLoadingTranscript(true)
        const response = await transcriptsAPI.get(session.transcript_id)
        setSelectedTranscript(response.data)
      } catch (error) {
        console.error('Failed to load transcript:', error)
        setSelectedTranscript(null)
      } finally {
        setLoadingTranscript(false)
      }
    } else {
      setSelectedTranscript(null)
    }
  }

  const handleCloseTranscript = () => {
    setSelectedSession(null)
    setSelectedTranscript(null)
  }

  // Session List View Component
  const SessionListView = ({ sessions, onSessionClick, onSwitchToCalendar }) => {
    // Sort sessions by date (most recent first)
    const sortedSessions = [...sessions].sort((a, b) => {
      const dateA = a.date ? new Date(a.date) : new Date(0)
      const dateB = b.date ? new Date(b.date) : new Date(0)
      return dateB - dateA
    })

    const handleDeleteSession = async (session, e) => {
      e.stopPropagation() // Prevent triggering session click
      
      if (!session.is_scheduled || !session.session_id) {
        return // Only allow deleting scheduled sessions
      }

      // Confirm deletion
      const sessionDate = session.scheduled_at ? new Date(session.scheduled_at) : (session.date ? new Date(session.date) : new Date())
      if (!window.confirm(`Are you sure you want to cancel this ${session.subject || explodingObject?.subtitle || ''} session scheduled for ${sessionDate.toLocaleString()}?`)) {
        return
      }

      try {
        await sessionsApi.cancelSession(session.session_id, studentId)
        
        // Reload subject detail to reflect the change
        if (explodingObject?.subtitle || subjectName) {
          loadSubjectDetail()
        }
        
        // If this was the selected session, clear the selection
        if (selectedSession?.id === session.id) {
          setSelectedSession(null)
          setSelectedTranscript(null)
        }
      } catch (err) {
        console.error('Failed to cancel session:', err)
        alert('Failed to cancel session: ' + (err.response?.data?.error || err.message))
      }
    }

    return (
      <div className="session-list-container">
        <div className="session-list-header">
          <h2>{explodingObject?.subtitle || 'Study Sessions'}</h2>
          <button 
            className="view-switch-button"
            onClick={onSwitchToCalendar}
          >
            Switch to Calendar View
          </button>
        </div>
        <p className="session-list-subtitle">Select a session to view details</p>
        
        <div className="session-list">
          {sortedSessions.length === 0 ? (
            <div className="session-list-empty">
              <p>No sessions found for this subject.</p>
            </div>
          ) : (
            sortedSessions.map((session, index) => {
              const date = session.date ? new Date(session.date) : new Date()
              const isSelected = selectedSession?.id === session.id
              
              return (
                <div
                  key={session.id || index}
                  className={`session-list-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSessionClick(session)}
                >
                  <div className="session-list-item-content">
                    <div className="session-list-item-header-row">
                      <div className="session-list-item-date">
                        {date.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                        {session.is_scheduled && (
                          <span className="session-scheduled-badge" style={{ marginLeft: '0.5rem' }}>Scheduled</span>
                        )}
                      </div>
                      {session.is_scheduled && (
                        <button
                          className="session-delete-button"
                          onClick={(e) => handleDeleteSession(session, e)}
                          title="Cancel this session"
                          aria-label="Cancel session"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <div className="session-list-item-topic">
                      {session.topic || 'General Session'}
                    </div>
                    <div className="session-list-item-meta">
                      {session.duration_minutes && (
                        <span className="session-meta-item">
                          {session.duration_minutes} min
                        </span>
                      )}
                      {session.understanding_level != null && (
                        <span className="session-meta-item understanding">
                          {Number(session.understanding_level).toFixed(0)}% understanding
                        </span>
                      )}
                      {session.is_scheduled && session.scheduled_at && (
                        <span className="session-meta-item">
                          {new Date(session.scheduled_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  {!session.is_scheduled && <div className="session-list-item-arrow">→</div>}
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  // Learning Points Display Component - formats long text into readable bullet points
  const LearningPointsDisplay = ({ text }) => {
    const [isExpanded, setIsExpanded] = useState(false)
    
    if (!text) return null
    
    // Split text into sentences or bullet points
    // First, try to split by common bullet point markers
    let points = []
    if (text.includes('•') || text.includes('-') || text.includes('*')) {
      // Split by bullet markers
      points = text.split(/[•\-\*]/).filter(p => p.trim().length > 0).map(p => p.trim())
    } else if (text.includes('\n')) {
      // Split by newlines
      points = text.split('\n').filter(p => p.trim().length > 0).map(p => p.trim())
    } else {
      // Split by sentences (period, exclamation, question mark followed by space)
      points = text.split(/[.!?]\s+/).filter(p => p.trim().length > 0).map(p => {
        const trimmed = p.trim()
        // Add period if it doesn't end with punctuation
        return trimmed.match(/[.!?]$/) ? trimmed : trimmed + '.'
      })
    }
    
    // Limit to 5 points initially if not expanded
    const displayPoints = isExpanded ? points : points.slice(0, 5)
    const hasMore = points.length > 5
    
    return (
      <div className="learning-points-content">
        <ul className="learning-points-list">
          {displayPoints.map((point, idx) => (
            <li key={idx} className="learning-point-item">
              {point}
            </li>
          ))}
        </ul>
        {hasMore && (
          <button 
            className="learning-points-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Show Less' : `Show ${points.length - 5} More Points`}
          </button>
        )}
      </div>
    )
  }

  // Session Summary View Component
  const SessionSummaryView = ({ session, transcript, loading }) => {
    const [showAskAI, setShowAskAI] = useState(false)

    if (loading) {
      return (
        <div className="session-summary-loading">
          <div className="loading-spinner"></div>
          <p>Loading session details...</p>
        </div>
      )
    }

    if (!session) {
      return (
        <div className="session-summary-empty">
          <p>Select a session date to view details</p>
        </div>
      )
    }

    const summary = session.summary || {}
    const date = session.date ? new Date(session.date) : new Date()

    const handleAskAIClick = () => {
      setShowAskAI(!showAskAI)
    }

    return (
      <div className="session-summary-content">
        <div className="session-summary-header">
          <h3>Session Summary</h3>
          <button 
            className="close-summary-button"
            onClick={handleCloseTranscript}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="session-summary-info">
          <div className="summary-info-row">
            <span className="summary-label">Date:</span>
            <span className="summary-value">{date.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</span>
          </div>
          {session.topic && (
            <div className="summary-info-row">
              <span className="summary-label">Topic:</span>
              <span className="summary-value">{session.topic}</span>
            </div>
          )}
          {session.duration_minutes && (
            <div className="summary-info-row">
              <span className="summary-label">Duration:</span>
              <span className="summary-value">{session.duration_minutes} minutes</span>
            </div>
          )}
          {session.understanding_level != null && (
            <div className="summary-info-row">
              <span className="summary-label">Understanding Level:</span>
              <span className="summary-value understanding-level">
                {Number(session.understanding_level).toFixed(0)}%
              </span>
            </div>
          )}
        </div>

        {summary.key_concepts && summary.key_concepts.length > 0 && (
          <div className="summary-section">
            <h4>Key Concepts</h4>
            <div className="concept-tags">
              {summary.key_concepts.map((concept, idx) => (
                <span key={idx} className="concept-tag">{concept}</span>
              ))}
            </div>
          </div>
        )}

        {summary.extracted_topics && summary.extracted_topics.length > 0 && (
          <div className="summary-section">
            <h4>Topics Covered</h4>
            <div className="concept-tags">
              {summary.extracted_topics.map((topic, idx) => (
                <span key={idx} className="concept-tag">{topic}</span>
              ))}
            </div>
          </div>
        )}

        {summary.learning_points && (
          <div className="summary-section learning-points-section">
            <h4>Learning Points</h4>
            <LearningPointsDisplay text={summary.learning_points} />
          </div>
        )}

        {summary.strengths_identified && summary.strengths_identified.length > 0 && (
          <div className="summary-section">
            <h4>Strengths</h4>
            <ul className="summary-list">
              {summary.strengths_identified.map((strength, idx) => (
                <li key={idx}>{strength}</li>
              ))}
            </ul>
          </div>
        )}

        {summary.areas_for_improvement && summary.areas_for_improvement.length > 0 && (
          <div className="summary-section">
            <h4>Areas for Improvement</h4>
            <ul className="summary-list">
              {summary.areas_for_improvement.map((area, idx) => (
                <li key={idx}>{area}</li>
              ))}
            </ul>
          </div>
        )}

        {transcript && transcript.transcript_content && (
          <div className="summary-section">
            <h4>Full Transcript</h4>
            <div className="transcript-preview">
              <p className="transcript-excerpt">
                {transcript.transcript_content.substring(0, 500)}
                {transcript.transcript_content.length > 500 && '...'}
              </p>
            </div>
          </div>
        )}

        {/* Ask AI Button */}
        <div className="session-ask-ai-section">
          <button 
            className="ask-ai-session-button"
            onClick={handleAskAIClick}
          >
            {showAskAI ? '✕ Close AI Chat' : '💬 Ask AI About This Session'}
          </button>
        </div>

        {/* AI Chat Panel */}
        {showAskAI && (
          <div className="session-ai-chat-panel">
            <AiCompanionChat
              studentId={studentId}
              subject={session.subject}
              apiKey={localStorage.getItem('openai_api_key')}
              useOpenRouter={localStorage.getItem('use_openrouter') === 'true'}
              sessionId={session.id}
              sessionContext={{
                sessionId: session.id,
                topic: session.topic,
                date: date.toISOString(),
                summary: summary,
                transcript: transcript
              }}
            />
          </div>
        )}
      </div>
    )
  }

  // Calculate overall progress from goals
  const calculateProgress = () => {
    if (!subjectDetail || !subjectDetail.goals || subjectDetail.goals.length === 0) {
      return 0
    }
    const activeGoals = subjectDetail.goals.filter(g => g.status === 'active')
    if (activeGoals.length === 0) return 0
    const totalProgress = activeGoals.reduce((sum, goal) => sum + (goal.progress_percentage || 0), 0)
    return Math.round(totalProgress / activeGoals.length)
  }

  // Get start and end of current week (Sunday to Saturday)
  const getWeekBounds = () => {
    const today = new Date()
    const currentDay = today.getDay() // 0 = Sunday, 6 = Saturday
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - currentDay) // Go back to Sunday
    startOfWeek.setHours(0, 0, 0, 0)
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6) // Saturday
    endOfWeek.setHours(23, 59, 59, 999)
    
    return { startOfWeek, endOfWeek }
  }

  // Get sessions in the current week
  const getSessionsThisWeek = () => {
    if (!sessions || sessions.length === 0) return []
    
    const { startOfWeek, endOfWeek } = getWeekBounds()
    
    return sessions.filter(session => {
      if (!session.date) return false
      const sessionDate = new Date(session.date)
      return sessionDate >= startOfWeek && sessionDate <= endOfWeek
    })
  }

  // Count sessions in the current week (Sunday to Saturday)
  const countSessionsThisWeek = () => {
    return getSessionsThisWeek().length
  }

  const handleSectionClick = (sectionName, event) => {
    if (!explodingObject) return
    
    const rect = event.currentTarget.getBoundingClientRect()
    setSectionClickPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height
    })
    
    // Map internal section names to URL section names
    const sectionUrlMap = {
      'practice': 'practice',
      'goals': 'goals',
      'study-sessions': 'sessions',
      'upcoming-sessions': 'upcoming-sessions',
      'ask-ai': 'ask-ai',
      'progress': 'progress'
    }
    const urlSection = sectionUrlMap[sectionName] || sectionName
    
    // Update URL
    const subjectSlug = subjectNameToSlug(explodingObject.subtitle)
    navigate(`/subject/${subjectSlug}/${urlSection}`, { replace: false })
    
    setSelectedSection(sectionName)
  }

  const handleBackToSubject = () => {
    if (!explodingObject) return
    
    // Update URL to subject page without section
    const subjectSlug = subjectNameToSlug(explodingObject.subtitle)
    navigate(`/subject/${subjectSlug}`, { replace: false })
    
    setSelectedSection(null)
    setSectionClickPosition(null)
    setSelectedSession(null)
    setSelectedTranscript(null)
  }

  const SubjectDetailLayout = ({ subject }) => {
    const progress = calculateProgress()
    const goals = subjectDetail?.goals || []
    const activeGoals = goals.filter(g => g.status === 'active')
    
    // Get the two lowest progress long-term goals
    // Use long_term_goals from API if available, otherwise filter from all goals
    const allLongTermGoals = subjectDetail?.long_term_goals || 
      (subjectDetail?.goals || []).filter(g => g.goal_type === 'long_term')
    // Filter for active goals only
    const longTermGoals = allLongTermGoals.filter(g => g.status === 'active')
    const lowestTwoLongTermGoals = longTermGoals
      .sort((a, b) => (a.progress_percentage || 0) - (b.progress_percentage || 0))
      .slice(0, 2)
    
    // Simple calendar preview - show current week (Sunday - Saturday)
    const today = new Date()
    const currentDay = today.getDay() // 0 = Sunday, 6 = Saturday
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - currentDay) // Go back to Sunday
    
    // Get all 7 days of the current week
    const weekDays = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      weekDays.push(day)
    }
    
    const isCurrentDay = (date) => {
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear()
    }
    
    const hasSessionOnDay = (date) => {
      return sessions.some(session => {
        if (!session.date) return false
        const sessionDate = new Date(session.date)
        return sessionDate.getFullYear() === date.getFullYear() &&
               sessionDate.getMonth() === date.getMonth() &&
               sessionDate.getDate() === date.getDate()
      })
    }
    
    return (
      <div className="subject-detail-layout">
        {/* Left Column: Study Sessions + Upcoming Sessions */}
        <div className="subject-detail-column left-column">
          <div 
            className="subject-detail-section clickable-section"
            onClick={(e) => handleSectionClick('study-sessions', e)}
          >
            <h3 className="section-title">Calendar</h3>
            {loadingSubjectDetail ? (
              <div className="loading-text">Loading...</div>
            ) : (
              <div className="calendar-preview">
                <div className="calendar-preview-week-grid">
                  {weekDays.map((date, i) => {
                    const isToday = isCurrentDay(date)
                    const hasSession = hasSessionOnDay(date)
                    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]
                    const monthAbbr = date.toLocaleDateString('en-US', { month: 'short' })
                    const dayNumber = date.getDate()
                    
                    return (
                      <div 
                        key={i} 
                        className={`calendar-preview-week-day ${isToday ? 'current-day' : ''} ${hasSession ? 'has-session' : ''}`}
                      >
                        <div className="calendar-preview-day-name">{dayName}</div>
                        <div className="calendar-preview-day-label">
                          <span className="calendar-preview-month-abbr">{monthAbbr}</span>
                          <span className="calendar-preview-day-number">{dayNumber}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="section-click-hint">Click to view full calendar →</div>
              </div>
            )}
          </div>

          <div 
            className="subject-detail-section clickable-section"
            onClick={(e) => handleSectionClick('upcoming-sessions', e)}
          >
            <h3 className="section-title">Sessions This Week</h3>
            {loadingSubjectDetail ? (
              <div className="loading-text">Loading...</div>
            ) : (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: '1.5rem 0',
                gap: '0.5rem'
              }}>
                <div style={{ 
                  fontSize: '3rem', 
                  fontWeight: '700',
                  color: 'rgba(99, 102, 241, 0.9)',
                  lineHeight: '1'
                }}>
                  {countSessionsThisWeek()}
                        </div>
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: 'rgba(255, 255, 255, 0.7)',
                  textAlign: 'center'
                }}>
                  {countSessionsThisWeek() === 1 ? 'session' : 'sessions'} this week
                      </div>
                {countSessionsThisWeek() < 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowBookingModal(true)
                    }}
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.5rem 1rem',
                      backgroundColor: 'rgba(99, 102, 241, 0.9)',
                      color: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = 'rgba(99, 102, 241, 1)'
                      e.target.style.transform = 'scale(1.05)'
                      e.target.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'rgba(99, 102, 241, 0.9)'
                      e.target.style.transform = 'scale(1)'
                      e.target.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.3)'
                    }}
                  >
                    Schedule now!
                  </button>
                )}
                </div>
            )}
          </div>
        </div>

        {/* Middle Column: Goals + Progress Circle */}
        <div className="subject-detail-column middle-column">
          <div 
            className="subject-detail-section clickable-section"
            onClick={(e) => handleSectionClick('goals', e)}
          >
            <h3 className="section-title">Goals</h3>
            {loadingSubjectDetail ? (
              <div className="loading-text">Loading...</div>
            ) : lowestTwoLongTermGoals.length === 0 ? (
              <div className="empty-state">No active long-term goals for this subject</div>
            ) : (
              <>
                <div className="goals-preview">
                  {lowestTwoLongTermGoals.map((goal) => (
                    <div key={goal.id} className="goal-item-preview">
                      <div className="goal-title-preview">{goal.title}</div>
                      <div className="goal-progress-bar-preview">
                        <div 
                          className="goal-progress-fill-preview"
                          style={{ width: `${goal.progress_percentage || 0}%` }}
                        />
                      </div>
                      <div className="goal-progress-text-preview">
                        {goal.progress_percentage || 0}%
                      </div>
                    </div>
                  ))}
                </div>
                {longTermGoals.length > 2 && (
                  <div className="section-click-hint">+{longTermGoals.length - 2} more - Click to view all →</div>
                )}
              </>
            )}
          </div>

          <div 
            className="subject-detail-section clickable-section"
            onClick={(e) => handleSectionClick('progress', e)}
          >
            <h3 className="section-title">Overall Progress</h3>
            <div className="progress-circle-preview-container">
              <div className="progress-circle-preview">
                <svg className="progress-circle-svg-preview" viewBox="0 0 120 120">
                  <circle
                    className="progress-circle-bg-preview"
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="8"
                  />
                  <circle
                    className="progress-circle-fill-preview"
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="rgba(99, 102, 241, 0.8)"
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 54}`}
                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="progress-circle-text-preview">
                  <div className="progress-circle-value-preview">{progress}%</div>
                  <div className="progress-circle-label-preview">Complete</div>
                </div>
              </div>
              <div className="section-click-hint">Click to view detailed analytics →</div>
            </div>
          </div>
        </div>

        {/* Right Column: Practice Problems + Ask AI */}
        <div className="subject-detail-column right-column">
          <div 
            className="subject-detail-section clickable-section"
            onClick={(e) => handleSectionClick('practice', e)}
          >
            <h3 className="section-title">Practice Problems</h3>
            <div className="practice-problems-preview">
              {loadingSubjectDetail ? (
                <div className="loading-text">Loading...</div>
              ) : (
                <>
                  <div className="preview-placeholder">
                    <div className="preview-icon">📝</div>
                    <div className="preview-text">Practice problems tailored to your level</div>
                  </div>
                  <div className="section-click-hint">Click to start practicing →</div>
                </>
              )}
            </div>
          </div>

          <div 
            className="subject-detail-section clickable-section"
            onClick={(e) => handleSectionClick('ask-ai', e)}
          >
            <h3 className="section-title">Homework Help with AI</h3>
            <div className="ask-ai-preview">
              <div className="preview-placeholder">
                <div className="preview-icon">🤖</div>
                <div className="preview-text">Get help from your AI study companion</div>
              </div>
              <div className="section-click-hint">Click to chat with AI →</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Full page views for each section
  const SectionFullView = ({ section, subject }) => {
    if (!section) return null

    switch (section) {
      case 'study-sessions':
        return (
          <div className="section-full-view">
            <button className="back-to-subject-button" onClick={handleBackToSubject}>
              ← Back to {subject?.subtitle}
            </button>
            <h2 className="section-full-title">Calendar</h2>
            {loadingSubjectDetail ? (
              <div className="loading-sessions">Loading sessions...</div>
            ) : (
              <div className="calendar-with-summary">
                <div className={`${viewMode === 'calendar' ? 'calendar-panel' : 'list-panel'}`}>
                  {viewMode === 'calendar' ? (
                    <Calendar 
                      sessions={sessions}
                      subject={subject.subtitle}
                      onDayClick={handleCalendarDayClick}
                      onSwitchToList={() => setViewMode('list')}
                      compact={true}
                    />
                  ) : (
                    <SessionListView 
                      sessions={sessions}
                      onSessionClick={handleSessionClick}
                      onSwitchToCalendar={() => setViewMode('calendar')}
                    />
                  )}
                </div>
                {selectedSession && (
                  <div className="session-summary-panel">
                    <SessionSummaryView 
                      session={selectedSession}
                      transcript={selectedTranscript}
                      loading={loadingTranscript}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )

      case 'upcoming-sessions':
        return (
          <div className="section-full-view">
            <button className="back-to-subject-button" onClick={handleBackToSubject}>
              ← Back to {subject?.subtitle}
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 className="section-full-title-upcoming">Sessions This Week</h2>
              {!loadingSubjectDetail && countSessionsThisWeek() > 0 && (
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: 'rgba(99, 102, 241, 0.9)',
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.375rem',
                  fontWeight: '500',
                  border: '1px solid rgba(99, 102, 241, 0.3)'
                }}>
                  {countSessionsThisWeek()} session{countSessionsThisWeek() !== 1 ? 's' : ''} this week
                </div>
              )}
            </div>
            {loadingSubjectDetail ? (
              <div className="loading-text">Loading...</div>
            ) : countSessionsThisWeek() === 0 ? (
              <div className="empty-state" style={{ 
                textAlign: 'center', 
                padding: '3rem 2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
                background: 'transparent',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                {sessions.length === 0 ? (
                  <>
                    <div style={{ fontSize: '1.125rem', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                      You haven't had a session for this subject yet.
                    </div>
                    <div style={{ fontSize: '0.9375rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1rem' }}>
                      Schedule your first session to get started!
                    </div>
                    <button 
                      className="schedule-session-button"
                      onClick={() => {
                        setShowBookingModal(true)
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: 'rgba(99, 102, 241, 0.9)',
                        color: 'rgba(255, 255, 255, 0.9)',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '600',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(99, 102, 241, 1)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(99, 102, 241, 0.9)'}
                    >
                      Schedule a New Session Now
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '1.125rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                      No sessions scheduled for this week
                    </div>
                    <div style={{ fontSize: '0.9375rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1rem' }}>
                      You have {sessions.length} total session{sessions.length !== 1 ? 's' : ''} for this subject
                    </div>
                    <button 
                      className="schedule-session-button"
                      onClick={() => {
                        setShowBookingModal(true)
                      }}
                      style={{
                        marginTop: '1rem',
                        padding: '0.75rem 1.5rem',
                        backgroundColor: 'rgba(99, 102, 241, 0.9)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '600',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(99, 102, 241, 1)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(99, 102, 241, 0.9)'}
                    >
                      Schedule a New Session
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="upcoming-sessions-list-full">
                {getSessionsThisWeek().map((session, idx) => {
                  const date = session.date ? new Date(session.date) : new Date()
                  return (
                    <div key={idx} className="upcoming-session-item-full">
                      <div className="upcoming-session-date-full">
                        {date.toLocaleDateString('en-US', { 
                          weekday: 'long',
                          month: 'long', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="upcoming-session-info-full">
                        <div className="upcoming-session-topic-full">{session.topic || 'General Session'}</div>
                        {session.duration_minutes && (
                          <div className="upcoming-session-duration-full">{session.duration_minutes} minutes</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )

      case 'goals':
        const allGoals = subjectDetail?.goals || []
        const shortTermGoals = subjectDetail?.short_term_goals || allGoals.filter(g => g.goal_type === 'short_term')
        const longTermGoals = subjectDetail?.long_term_goals || allGoals.filter(g => g.goal_type === 'long_term')
        const activeShortTermGoals = shortTermGoals.filter(g => g.status === 'active')
        
        const handleGoalComplete = async (goalId) => {
          try {
            await goalsApi.updateGoal(studentId, goalId, { status: 'completed', completed_at: new Date().toISOString().split('T')[0] })
            // Reload subject detail
            loadSubjectDetail()
          } catch (err) {
            console.error('Failed to complete goal:', err)
            alert('Failed to complete goal: ' + (err.response?.data?.error || err.message))
          }
        }

        const handleGoalDelete = async (goalId) => {
          if (!window.confirm('Are you sure you want to delete this goal?')) return
          try {
            await goalsApi.deleteGoal(studentId, goalId)
            // Reload subject detail
            loadSubjectDetail()
          } catch (err) {
            console.error('Failed to delete goal:', err)
            alert('Failed to delete goal: ' + (err.response?.data?.error || err.message))
          }
        }

        return (
          <div className="section-full-view">
            <button className="back-to-subject-button" onClick={handleBackToSubject}>
              ← Back to {subject?.subtitle}
            </button>
            <h2 className="section-full-title">Goals</h2>
            
            {loadingSubjectDetail ? (
              <div className="loading-text">Loading...</div>
            ) : (
              <>
                {/* Long-term Goals Section */}
                {longTermGoals.length > 0 && (
                  <div className="goals-section-type">
                    <h3 className="goals-section-title">Long-Term Goals</h3>
              <div className="goals-list-full">
                      {longTermGoals.map((goal) => (
                  <div key={goal.id} className="goal-item-full">
                    <div className="goal-header-full">
                      <div className="goal-title-full">{goal.title}</div>
                      <div className="goal-progress-percentage-full">{goal.progress_percentage || 0}%</div>
                    </div>
                    {goal.description && (
                      <div className="goal-description-full">{goal.description}</div>
                    )}
                    <div className="goal-progress-bar-full">
                      <div 
                        className="goal-progress-fill-full"
                        style={{ width: `${goal.progress_percentage || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
                    </div>
              </div>
                )}

                {/* Short-term Goals Section */}
                <div className="goals-section-type">
                  <h3 className="goals-section-title">Short-Term Goals</h3>
                  {activeShortTermGoals.length === 0 ? (
                    <div className="empty-state" style={{ 
                      background: 'transparent',
                      color: 'rgba(255, 255, 255, 0.7)',
                      padding: '2rem'
                    }}>
                      No active short-term goals for this subject
                    </div>
                  ) : (
                    <div className="short-term-goals-list">
                      {activeShortTermGoals.map((goal) => (
                        <ShortTermGoalCard
                          key={goal.id}
                          goal={goal}
                          onComplete={handleGoalComplete}
                          onDelete={handleGoalDelete}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )

      case 'progress': {
        const mastery = subjectDetail?.mastery || {}
        const allGoals = subjectDetail?.goals || []
        const isGoalBased = mastery.goals_count > 0
        const progressPercentage = mastery.percentage || calculateProgress()
        
        // Get latest understanding level from transcripts if not goal-based
        const latestTranscript = sessions && sessions.length > 0 
          ? sessions.find(s => s.understanding_level != null) || sessions[0]
          : null
        
        return (
          <div className="section-full-view">
            <button className="back-to-subject-button" onClick={handleBackToSubject}>
              ← Back to {subject?.subtitle}
            </button>
            <h2 className="section-full-title">Progress Analytics</h2>
            
            {loadingSubjectDetail ? (
              <div className="loading-text">Loading...</div>
            ) : (
              <div className="progress-analytics-breakdown">
                {/* Overall Progress Circle */}
                <div className="progress-breakdown-header">
              <div className="progress-circle-full-container">
                <div className="progress-circle-full">
                  <svg className="progress-circle-svg-full" viewBox="0 0 120 120">
                    <circle
                      className="progress-circle-bg-full"
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.1)"
                      strokeWidth="8"
                    />
                    <circle
                      className="progress-circle-fill-full"
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke="rgba(99, 102, 241, 0.8)"
                      strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 54}`}
                          strokeDashoffset={`${2 * Math.PI * 54 * (1 - progressPercentage / 100)}`}
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                    />
                  </svg>
                  <div className="progress-circle-text-full">
                        <div className="progress-circle-value-full">{progressPercentage.toFixed(1)}%</div>
                        <div className="progress-circle-label-full">{mastery.level || 'Needs Work'}</div>
                  </div>
                </div>
              </div>
                  
                  {/* Calculation Method */}
                  <div className="progress-calculation-method">
                    <h3>How This Is Calculated</h3>
                    {isGoalBased ? (
                      <div className="calculation-info">
                        <div className="calculation-badge goal-based">
                          <span className="badge-icon">🎯</span>
                          <span>Goal-Based Calculation</span>
            </div>
                        <p className="calculation-description">
                          Your progress is calculated as the average of all goal progress percentages.
                        </p>
                        <div className="calculation-formula">
                          Average = ({allGoals.map(g => `${g.progress_percentage || 0}%`).join(' + ')}) ÷ {allGoals.length} = {progressPercentage.toFixed(1)}%
                        </div>
                      </div>
                    ) : (
                      <div className="calculation-info">
                        <div className="calculation-badge understanding-based">
                          <span className="badge-icon">📊</span>
                          <span>Understanding Level Based</span>
                        </div>
                        <p className="calculation-description">
                          Your progress is based on your latest understanding level from session transcripts.
                        </p>
                        {latestTranscript && latestTranscript.understanding_level != null && (
                          <div className="calculation-formula">
                            Latest Understanding Level: {Number(latestTranscript.understanding_level).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Goals Breakdown (if goal-based) */}
                {isGoalBased && allGoals.length > 0 && (
                  <div className="progress-breakdown-section">
                    <h3>Goal Breakdown</h3>
                    <div className="goals-breakdown-list">
                      {allGoals.map((goal) => (
                        <div key={goal.id} className="goal-breakdown-item">
                          <div className="goal-breakdown-header">
                            <div className="goal-breakdown-title">
                              <span className="goal-type-badge">{goal.goal_type === 'long_term' ? 'Long-Term' : 'Short-Term'}</span>
                              <span className="goal-title-text">{goal.title}</span>
                            </div>
                            <div className="goal-breakdown-progress">
                              {goal.progress_percentage || 0}%
                            </div>
                          </div>
                          <div className="goal-breakdown-bar">
                            <div 
                              className="goal-breakdown-bar-fill"
                              style={{ width: `${goal.progress_percentage || 0}%` }}
                            />
                          </div>
                          <div className="goal-breakdown-status">
                            Status: <span className={`status-${goal.status}`}>{goal.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Goal Statistics */}
                {isGoalBased && (
                  <div className="progress-breakdown-section">
                    <h3>Goal Statistics</h3>
                    <div className="goal-stats-grid">
                      <div className="goal-stat-card">
                        <div className="goal-stat-value">{mastery.goals_count || 0}</div>
                        <div className="goal-stat-label">Total Goals</div>
                      </div>
                      <div className="goal-stat-card active">
                        <div className="goal-stat-value">{mastery.active_goals || 0}</div>
                        <div className="goal-stat-label">Active</div>
                      </div>
                      <div className="goal-stat-card completed">
                        <div className="goal-stat-value">{mastery.completed_goals || 0}</div>
                        <div className="goal-stat-label">Completed</div>
                      </div>
                      {mastery.paused_goals > 0 && (
                        <div className="goal-stat-card paused">
                          <div className="goal-stat-value">{mastery.paused_goals || 0}</div>
                          <div className="goal-stat-label">Paused</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Understanding Level History (if not goal-based) */}
                {!isGoalBased && sessions && sessions.length > 0 && (
                  <div className="progress-breakdown-section">
                    <h3>Understanding Level History</h3>
                    <div className="understanding-history-list">
                      {sessions
                        .filter(s => s.understanding_level != null)
                        .slice(0, 5)
                        .map((session, idx) => {
                          const date = session.date ? new Date(session.date) : new Date()
                          return (
                            <div key={idx} className="understanding-history-item">
                              <div className="understanding-history-date">
                                {date.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </div>
                              <div className="understanding-history-level">
                                {Number(session.understanding_level).toFixed(1)}%
                              </div>
                              {session.topic && (
                                <div className="understanding-history-topic">{session.topic}</div>
                              )}
          </div>
        )
                        })}
                    </div>
                  </div>
                )}

                {/* Mastery Level Info */}
                <div className="progress-breakdown-section">
                  <h3>Mastery Levels</h3>
                  <div className="mastery-levels-info">
                    <div className={`mastery-level-item ${mastery.level === 'Needs Work' ? 'active' : ''}`}>
                      <div className="mastery-level-range">0% - 51%</div>
                      <div className="mastery-level-name">Needs Work</div>
                    </div>
                    <div className={`mastery-level-item ${mastery.level === 'Proficient' ? 'active' : ''}`}>
                      <div className="mastery-level-range">52% - 69%</div>
                      <div className="mastery-level-name">Proficient</div>
                    </div>
                    <div className={`mastery-level-item ${mastery.level === 'Advanced' ? 'active' : ''}`}>
                      <div className="mastery-level-range">70% - 89%</div>
                      <div className="mastery-level-name">Advanced</div>
                    </div>
                    <div className={`mastery-level-item ${mastery.level === 'Master' ? 'active' : ''}`}>
                      <div className="mastery-level-range">90% - 100%</div>
                      <div className="mastery-level-name">Master</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      }

      case 'practice': {
        const practiceGoals = subjectDetail?.goals || []
        const practiceSessions = sessions || []
        
        // Calculate recommended number of practice problems based on last session
        let recommendedProblems = null
        let recommendationBreakdown = null
        let lastSessionData = null
        
        if (practiceSessions && practiceSessions.length > 0) {
          // Find the most recent session with understanding_level
          const sessionsWithUnderstanding = practiceSessions
            .filter(s => s.date && s.understanding_level != null)
            .sort((a, b) => {
              const dateA = new Date(a.date)
              const dateB = new Date(b.date)
              return dateB - dateA // Most recent first
            })
          
          if (sessionsWithUnderstanding.length > 0) {
            const lastSession = sessionsWithUnderstanding[0]
            const understandingLevel = Number(lastSession.understanding_level) || 0
            const lastSessionDate = new Date(lastSession.date)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            lastSessionDate.setHours(0, 0, 0, 0)
            
            const daysSince = Math.floor((today - lastSessionDate) / (1000 * 60 * 60 * 24))
            
            // Calculate recommended problems
            // Understanding factor: lower understanding = more problems needed
            const understandingFactor = (100 - understandingLevel) / 15 // Range: 0-6.67
            
            // Days factor: longer gap = more problems needed (capped at 1.5x)
            const daysFactor = Math.min(1 + (daysSince / 30), 1.5)
            
            // Final calculation, clamped between 1-7
            recommendedProblems = Math.max(1, Math.min(7, Math.round(understandingFactor * daysFactor)))
            
            // Store breakdown data for tooltip
            recommendationBreakdown = {
              understandingLevel: understandingLevel.toFixed(1),
              daysSince,
              understandingFactor: understandingFactor.toFixed(2),
              daysFactor: daysFactor.toFixed(2),
              calculated: (understandingFactor * daysFactor).toFixed(2)
            }
            
            // Store last session data for areas of improvement
            lastSessionData = {
              date: lastSession.date,
              areasForImprovement: lastSession.summary?.areas_for_improvement || []
            }
          }
        }
        
        return (
          <div className="section-full-view">
            <button className="back-to-subject-button" onClick={handleBackToSubject}>
              ← Back to {subject?.subtitle}
            </button>
            <div className="section-full-title-container">
            <h2 className="section-full-title">Practice Problems</h2>
              {recommendedProblems !== null && (
                <div className="practice-recommendation-container">
                  <p className="practice-recommendation">
                    Tutor advises {recommendedProblems} {recommendedProblems === 1 ? 'practice problem' : 'practice problems'} before next session
                  </p>
                  {recommendationBreakdown && (
                    <div className="practice-recommendation-info">
                      <InfoCircledIcon className="info-icon" />
                      <div className="recommendation-tooltip">
                        <div className="tooltip-header">Why {recommendedProblems} {recommendedProblems === 1 ? 'problem' : 'problems'}?</div>
                        <div className="tooltip-section">
                          <div className="tooltip-label">Calculation Breakdown:</div>
                          <div className="tooltip-detail">Understanding Level: {recommendationBreakdown.understandingLevel}%</div>
                          <div className="tooltip-detail">Days Since Last Session: {recommendationBreakdown.daysSince}</div>
                          <div className="tooltip-detail">Understanding Factor: {recommendationBreakdown.understandingFactor}</div>
                          <div className="tooltip-detail">Days Factor: {recommendationBreakdown.daysFactor}x</div>
                          <div className="tooltip-detail">Calculated: {recommendationBreakdown.calculated} → {recommendedProblems} {recommendedProblems === 1 ? 'problem' : 'problems'}</div>
                        </div>
                        {lastSessionData && lastSessionData.areasForImprovement.length > 0 && (
                          <div className="tooltip-section">
                            <div className="tooltip-label">Points of Struggle (Last Session):</div>
                            <ul className="tooltip-list">
                              {lastSessionData.areasForImprovement.map((area, idx) => (
                                <li key={idx}>{area}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="practice-problems-full">
              <PracticeProblemList
                studentId={studentId}
                subject={subject.subtitle}
                apiKey={localStorage.getItem('openai_api_key')}
                useOpenRouter={localStorage.getItem('use_openrouter') === 'true'}
                goals={practiceGoals}
                sessions={practiceSessions}
              />
            </div>
          </div>
        )
      }

      case 'ask-ai':
        return (
          <div className="section-full-view">
            <button className="back-to-subject-button" onClick={handleBackToSubject}>
              ← Back to {subject?.subtitle}
            </button>
            <h2 className="section-full-title">Homework Help with AI</h2>
            <div className="ask-ai-full">
              <AiCompanionChat
                studentId={studentId}
                subject={subject.subtitle}
                apiKey={localStorage.getItem('openai_api_key')}
                useOpenRouter={localStorage.getItem('use_openrouter') === 'true'}
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Show loading state
  if (loadingSubjects) {
    return (
      <div className="student-dashboard-test">
        <div className="dashboard-background">
          <div className="gradient-orb orb-1" />
          <div className="gradient-orb orb-2" />
          <div className="gradient-orb orb-3" />
        </div>
        <div className="loading-container" style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '1.2rem',
          zIndex: 1000
        }}>
          <div>Loading student dashboard...</div>
        </div>
      </div>
    )
  }

  // Show error state
  if (subjectsError) {
    return (
      <div className="student-dashboard-test">
        <div className="dashboard-background">
          <div className="gradient-orb orb-1" />
          <div className="gradient-orb orb-2" />
          <div className="gradient-orb orb-3" />
        </div>
        <div className="error-container" style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '1.2rem',
          gap: '1rem'
        }}>
          <div>{subjectsError}</div>
          <button 
            onClick={loadSubjects}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6366f1',
              color: 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Show empty state if no subjects
  if (studentSubjects.length === 0 && !loadingSubjects) {
    const emptyMessage = !studentId 
      ? 'Loading student information...' 
      : subjectsError 
        ? subjectsError 
        : `No subjects found for student ${studentId}. Please generate some transcripts first.`
    
    return (
      <div className="student-dashboard-test">
        <div className="dashboard-background">
          <div className="gradient-orb orb-1" />
          <div className="gradient-orb orb-2" />
          <div className="gradient-orb orb-3" />
        </div>
        
        {/* Header with user menu */}
        <motion.div
          className="dashboard-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1>Nucleus</h1>
          <div className="welcome-user-wrapper-header" ref={userMenuRef}>
            <button 
              className="welcome-user-button-header"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              Welcome back {currentUserState?.name || `Student ${studentId}`}
            </button>
            {showUserMenu && (
              <div className="user-menu-dropdown-header">
                <button className="user-menu-item-header" onClick={() => { setShowUserMenu(false); navigate('/profile'); }}>
                  Profile
                </button>
                <button className="user-menu-item-header" onClick={() => { setShowUserMenu(false); navigate('/settings'); }}>
                  Settings
                </button>
                {authApi.isAdmin() && (
                  <button className="user-menu-item-header" onClick={() => { setShowUserMenu(false); navigate('/admin'); }}>
                    Admin Dashboard
                  </button>
                )}
                <button 
                  className="user-menu-item-header" 
                  onClick={async (e) => { 
                    e.preventDefault()
                    e.stopPropagation()
                    setShowUserMenu(false)
                    localStorage.removeItem('auth_token')
                    localStorage.removeItem('current_user')
                    // Force navigation
                    window.location.href = '/login'
                  }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </motion.div>
        
        <div className="empty-container" style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: 'calc(100vh - 80px)',
          marginTop: '80px',
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '1.2rem',
          zIndex: 1000,
          position: 'relative'
        }}>
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: '2rem',
            borderRadius: '0.5rem',
            textAlign: 'center'
          }}>
            {!studentId ? (
              'Loading student information...'
            ) : subjectsError ? (
              <div>
                <div>{subjectsError}</div>
                <button 
                  onClick={() => {
                    const user = authApi.getCurrentUser()
                    if (user?.id) {
                      setStudentId(user.id)
                    } else {
                      window.location.href = '/login'
                    }
                  }}
                  style={{
                    marginTop: '1rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer'
                  }}
                >
                  Retry
                </button>
              </div>
            ) : (
              `No subjects found for student ${studentId}. Please generate some transcripts first.`
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="student-dashboard-test">
      {/* Background with gradient */}
      <div className="dashboard-background">
        <div className="gradient-orb orb-1" />
        <div className="gradient-orb orb-2" />
        <div className="gradient-orb orb-3" />
      </div>


      {/* Exploded Subject Page */}
      <AnimatePresence mode="wait">
        {explodingObject ? (() => {
          // Use clickedIconPosition if available, otherwise use center of screen as default
          const position = clickedIconPosition || {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            width: 100,
            height: 100
          }
          
          return (
          <motion.div
            key="exploded-page"
            className="exploded-subject-page"
            initial={{
              clipPath: clickedIconPosition 
                ? `circle(${Math.max(position.width, position.height) / 2}px at ${position.x}px ${position.y}px)`
                : `circle(0px at ${position.x}px ${position.y}px)`,
              opacity: 0
            }}
            animate={{
              clipPath: `circle(${Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2)}px at ${position.x}px ${position.y}px)`,
              opacity: 1
            }}
            exit={{
              clipPath: clickedIconPosition
                ? `circle(${Math.max(position.width, position.height) / 2}px at ${position.x}px ${position.y}px)`
                : `circle(0px at ${position.x}px ${position.y}px)`,
              opacity: 0
            }}
            transition={{
              duration: 0.8,
              ease: [0.4, 0, 0.2, 1]
            }}
            style={{
              '--object-color': explodingObject.color,
              '--object-color-rgb': hexToRgb(explodingObject.color)
            }}
          >
            <div className="exploded-content">
              <button className="back-button" onClick={handleBackToDashboard}>
                ← Back
              </button>
              
              <div className="exploded-header">
                <div className="exploded-icon">{explodingObject.icon}</div>
                <div>
                  <h1>{explodingObject.title}</h1>
                  <p>{explodingObject.subtitle}</p>
                </div>
              </div>

              <div className="exploded-body">
                <AnimatePresence mode="wait">
                  {selectedSection ? (() => {
                    // Use sectionClickPosition if available, otherwise use center of screen as default
                    const position = sectionClickPosition || {
                      x: window.innerWidth / 2,
                      y: window.innerHeight / 2,
                      width: 100,
                      height: 100
                    }
                    
                    return (
                    <motion.div
                      key="section-full-view"
                      className="section-full-view-wrapper"
                      initial={{
                        clipPath: sectionClickPosition
                          ? `circle(${Math.max(position.width, position.height) / 2}px at ${position.x}px ${position.y}px)`
                          : `circle(0px at ${position.x}px ${position.y}px)`,
                        opacity: 0
                      }}
                      animate={{
                        clipPath: `circle(${Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2)}px at ${position.x}px ${position.y}px)`,
                        opacity: 1
                      }}
                      exit={{
                        clipPath: sectionClickPosition
                          ? `circle(${Math.max(position.width, position.height) / 2}px at ${position.x}px ${position.y}px)`
                          : `circle(0px at ${position.x}px ${position.y}px)`,
                        opacity: 0
                      }}
                      transition={{
                        duration: 0.6,
                        ease: [0.4, 0, 0.2, 1]
                      }}
                    >
                      <SectionFullView section={selectedSection} subject={explodingObject} />
                    </motion.div>
                    )
                  })() : (
                    <motion.div
                      key="subject-detail-layout"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <SubjectDetailLayout subject={explodingObject} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
          )
        })() : (
          <motion.div
            key="dashboard-content"
            className="scrollable-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Header */}
            <motion.div
              className="dashboard-header"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1>Nucleus</h1>
              <div className="welcome-user-wrapper-header" ref={userMenuRef}>
                <button 
                  className="welcome-user-button-header"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  Welcome back {currentUserState?.name || `Student ${studentId}`}
                </button>
                {showUserMenu && (
                  <div className="user-menu-dropdown-header">
                    <button className="user-menu-item-header" onClick={() => { setShowUserMenu(false); navigate('/profile'); }}>
                      Profile
                    </button>
                    <button className="user-menu-item-header" onClick={() => { setShowUserMenu(false); navigate('/settings'); }}>
                      Settings
                    </button>
                    {authApi.isAdmin() && (
                      <button className="user-menu-item-header" onClick={() => { setShowUserMenu(false); navigate('/admin'); }}>
                        Admin Dashboard
                      </button>
                    )}
                    <button 
                      className="user-menu-item-header" 
                      onClick={async (e) => { 
                        e.preventDefault()
                        e.stopPropagation()
                        setShowUserMenu(false)
                        localStorage.removeItem('auth_token')
                        localStorage.removeItem('current_user')
                        // Force navigation
                        window.location.href = '/login'
                      }}
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </motion.div>

        {/* Floating Objects Container */}
        <div className="floating-objects-container">
          {floatingObjects.map((object, index) => {
            const size = getSizeDimensions(object.progress)
            const isHovered = hoveredObject === object.id
            const isSelected = selectedObject?.id === object.id

            return (
              <motion.div
                key={object.id}
                className={`floating-object ${object.size} ${isSelected ? 'selected' : ''} ${draggingObject === object.id ? 'dragging' : ''}`}
                style={{
                  left: `${object.position.x}%`,
                  top: `${object.position.y}%`,
                  '--object-color': object.color,
                  '--object-color-rgb': hexToRgb(object.color),
                  width: `${size.width}px`,
                  height: `${size.height}px`,
                  cursor: draggingObject === object.id ? 'grabbing' : 'grab',
                  zIndex: draggingObject === object.id ? 1000 : 'auto'
                }}
              initial={{ opacity: 0, scale: 0, rotateY: -180, rotateX: -20, x: '-50%', y: '-50%' }}
              animate={{
                opacity: 1,
                scale: isHovered ? 1.08 : isSelected ? 1.12 : 1,
                rotateY: 0,
                rotateX: 0,
                x: '-50%',
                y: '-50%'
              }}
              transition={{
                opacity: { duration: 0.6, delay: index * 0.08 },
                scale: { duration: 0.4, type: 'spring', stiffness: 200 },
                rotateY: { duration: 1, delay: index * 0.08, type: 'spring' },
                rotateX: { duration: 1, delay: index * 0.08, type: 'spring' },
                x: { duration: 0 },
                y: { duration: 0 }
              }}
              whileHover={{
                scale: 1.08,
                rotateY: 8,
                rotateX: -5,
                x: '-50%',
                y: '-50%',
                transition: { duration: 0.4, type: 'spring', stiffness: 300 }
              }}
              whileTap={{ scale: draggingObject === object.id ? 1.1 : 0.98, x: '-50%', y: '-50%' }}
              onHoverStart={() => !draggingObject && setHoveredObject(object.id)}
              onHoverEnd={() => !draggingObject && setHoveredObject(null)}
              onClick={(e) => {
                // Only handle click if not dragging and didn't just drag
                if (!draggingObject && !hasDraggedRef.current) {
                  handleObjectClick(object, e)
                }
              }}
              onMouseDown={(e) => handleLongPressStart(object, e)}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
              onTouchStart={(e) => handleLongPressStart(object, e)}
              onTouchEnd={handleLongPressEnd}
              onTouchCancel={handleLongPressEnd}
              ref={(el) => {
                if (el) iconRefs.current[object.id] = el
              }}
            >
              {/* Glow effect */}
              <div className="object-glow" />
              
              {/* Object content - glossy blob */}
              <div className="object-content">
                <div className="object-icon">{object.icon}</div>
                <h3 className="object-title">{object.title}</h3>
                <p className="object-subtitle">{object.subtitle}</p>
                
                {object.progress > 0 && (
                  <div className="object-progress">
                    <div className="progress-bar">
                      <motion.div
                        className="progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${object.progress}%` }}
                        transition={{ duration: 1, delay: index * 0.1 + 0.5 }}
                      />
                    </div>
                    <span className="progress-text">{object.progress}%</span>
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
        </div>

        {/* Active Tab Content */}
        {activeTab === 'goals' && (
          <motion.div
            className="active-tab-content goals-tab-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'absolute',
              top: '120px',
              left: 0,
              right: 0,
              bottom: '120px',
              overflow: 'auto',
              zIndex: 10
            }}
          >
            <LongTermGoalsView 
              studentId={studentId} 
              onClose={() => setActiveTab(null)}
            />
          </motion.div>
        )}

        {activeTab === 'sessions' && (
          <motion.div
            className="active-tab-content sessions-tab-content"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              overflow: 'auto',
              zIndex: 10,
              background: 'rgba(10, 10, 15, 0.98)',
              backdropFilter: 'blur(20px)',
              width: '100%',
              height: '100%'
            }}
          >
            <AllSessionsView 
              studentId={studentId} 
              subjectColors={subjectColorMap}
              onClose={() => setActiveTab(null)}
            />
          </motion.div>
        )}

        {activeTab === 'practice' && (
          <motion.div
            className="active-tab-content homework-help-tab-content"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: '140px', /* Leave space for bottom tabs with extra margin */
              overflow: 'hidden',
              zIndex: 10,
              background: 'rgba(10, 10, 15, 0.98)',
              backdropFilter: 'blur(20px)',
              width: '100%',
              height: 'calc(100% - 140px)'
            }}
          >
            <AiCompanionChat
              studentId={studentId}
              subject={null}
              apiKey={localStorage.getItem('openai_api_key')}
              useOpenRouter={localStorage.getItem('use_openrouter') === 'true'}
              onClose={() => setActiveTab(null)}
            />
          </motion.div>
        )}

        {/* Bottom Icon Row */}
        <div className="bottom-icon-row">
          <div className="bottom-icon-container">
            {bottomIcons.map((icon) => (
              <motion.button
                key={icon.id}
                className={`bottom-icon-item ${activeTab === icon.id ? 'active' : ''}`}
                onClick={() => setActiveTab(activeTab === icon.id ? null : icon.id)}
                whileHover={{ scale: 1.1, y: -5 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * bottomIcons.indexOf(icon) }}
              >
                <div className="bottom-icon-wrapper">
                  <span className="bottom-icon-emoji">{icon.icon}</span>
                </div>
                <span className="bottom-icon-label">{icon.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedObject && (
          <>
            <motion.div
              className="modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseDetail}
            />
            <motion.div
              className="object-detail-modal"
              style={{ 
                '--object-color': selectedObject.color,
                '--object-color-rgb': hexToRgb(selectedObject.color)
              }}
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <button className="close-button" onClick={handleCloseDetail}>
                ×
              </button>
              
              <div className="detail-header">
                <div className="detail-icon">{selectedObject.icon}</div>
                <div>
                  <h2>{selectedObject.title}</h2>
                  <p>{selectedObject.subtitle}</p>
                </div>
              </div>

              <div className="detail-content">
                <div className="detail-section">
                  <h3>Progress Overview</h3>
                  <div className="progress-visualization">
                    <motion.div
                      className="circular-progress"
                      style={{ '--progress': selectedObject.progress, '--object-color': selectedObject.color }}
                    >
                      <svg viewBox="0 0 100 100">
                        <circle
                          className="progress-circle-bg"
                          cx="50"
                          cy="50"
                          r="45"
                        />
                        <motion.circle
                          className="progress-circle"
                          cx="50"
                          cy="50"
                          r="45"
                          initial={{ pathLength: 0 }}
                          animate={{ 
                            pathLength: selectedObject.progress / 100,
                            strokeDashoffset: 283 * (1 - selectedObject.progress / 100)
                          }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                        />
                      </svg>
                      <div className="progress-percentage">
                        {selectedObject.progress}%
                      </div>
                    </motion.div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Quick Actions</h3>
                  <div className="action-buttons">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="action-btn primary"
                    >
                      View Details
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="action-btn secondary"
                    >
                      Practice Now
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>


        {/* Floating particles effect */}
        <div className="particles-container">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="particle"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: 0
            }}
            animate={{
              y: [null, -100],
              opacity: [0, 0.6, 0],
              scale: [0, 1, 0]
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: 'easeOut'
            }}
          />
        ))}
      </div>

      {/* Session Booking Modal */}
      <EnhancedSessionBookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        studentId={studentId}
        subject={explodingObject?.subtitle || subjectName ? slugToSubjectName(subjectName) : null}
        onSuccess={() => {
          // Reload sessions after successful booking
          if (explodingObject?.subtitle || subjectName) {
            loadSubjectDetail()
          }
        }}
      />
    </div>
  )
}

export default StudentDashboardTest

