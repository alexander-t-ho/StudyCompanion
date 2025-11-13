/**
 * Client-side undo/redo manager
 * Manages local undo/redo stack for immediate feedback
 */

export interface UndoRedoAction {
  type: 'section_update' | 'section_create' | 'section_delete' | 'document_update'
  sectionId?: string
  sectionType?: string
  previousContent?: string
  newContent?: string
  previousState?: any
  newState?: any
  timestamp: number
}

export class UndoRedoManager {
  private undoStack: UndoRedoAction[] = []
  private redoStack: UndoRedoAction[] = []
  private maxStackSize = 50

  /**
   * Push an action to the undo stack
   */
  push(action: Omit<UndoRedoAction, 'timestamp'>) {
    const actionWithTimestamp: UndoRedoAction = {
      ...action,
      timestamp: Date.now(),
    }

    this.undoStack.push(actionWithTimestamp)
    this.redoStack = [] // Clear redo stack on new action

    // Limit stack size
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift()
    }
  }

  /**
   * Undo last action
   */
  undo(): UndoRedoAction | null {
    if (this.undoStack.length === 0) {
      return null
    }

    const action = this.undoStack.pop()!
    this.redoStack.push(action)
    return action
  }

  /**
   * Redo last undone action
   */
  redo(): UndoRedoAction | null {
    if (this.redoStack.length === 0) {
      return null
    }

    const action = this.redoStack.pop()!
    this.undoStack.push(action)
    return action
  }

  /**
   * Check if undo is possible
   */
  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  /**
   * Check if redo is possible
   */
  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /**
   * Clear both stacks
   */
  clear() {
    this.undoStack = []
    this.redoStack = []
  }

  /**
   * Get undo stack size
   */
  getUndoCount(): number {
    return this.undoStack.length
  }

  /**
   * Get redo stack size
   */
  getRedoCount(): number {
    return this.redoStack.length
  }

  /**
   * Get last action (for preview)
   */
  getLastAction(): UndoRedoAction | null {
    return this.undoStack.length > 0
      ? this.undoStack[this.undoStack.length - 1]
      : null
  }
}

