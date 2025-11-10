import React, { useState, useEffect } from 'react'
import { aiCompanionApi } from '../services/aiCompanionApi'
import { MathRenderer } from './MathRenderer'
import './PracticeProblem.css'

function PracticeProblem({ problemId, onComplete, apiKey, useOpenRouter, studentId }) {
  const [problem, setProblem] = useState(null)
  const [answer, setAnswer] = useState('')
  const [selectedOption, setSelectedOption] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadProblem()
  }, [problemId])

  const loadProblem = async () => {
    try {
      setLoading(true)
      const response = await aiCompanionApi.getPractice(problemId)
      setProblem(response.data)
      setError(null)
    } catch (err) {
      setError('Failed to load practice problem')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!answer && !selectedOption) {
      setError('Please provide an answer')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      
      const studentAnswer = problem?.problem_content?.problem_type === 'multiple_choice' 
        ? selectedOption 
        : answer
      
      const response = await aiCompanionApi.submitPractice(problemId, studentAnswer, apiKey, useOpenRouter)
      
      setProblem(response.data.problem)
      setFeedback(response.data.feedback)
      
      if (onComplete) {
        onComplete(response.data.problem)
      }
    } catch (err) {
      console.error('Full error object:', err)
      console.error('Error response:', err.response)
      console.error('Error response data:', err.response?.data)
      console.error('Error response status:', err.response?.status)
      console.error('Error response headers:', err.response?.headers)
      
      let errorMessage = 'Failed to submit answer'
      
      if (err.response?.data) {
        const data = err.response.data
        if (data.error) {
          errorMessage = data.error
        } else if (data.message) {
          errorMessage = data.message
        } else if (data.errors && Array.isArray(data.errors)) {
          errorMessage = data.errors.join(', ')
        } else if (typeof data === 'string') {
          errorMessage = data
        } else {
          errorMessage = JSON.stringify(data)
        }
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="practice-problem loading">Loading problem...</div>
  }

  if (error && !problem) {
    return <div className="practice-problem error">{error}</div>
  }

  if (!problem) {
    return <div className="practice-problem">Problem not found</div>
  }

  const isMultipleChoice = problem.problem_content?.problem_type === 'multiple_choice'
  const isCompleted = problem.completed_at != null
  const options = problem.problem_content?.options || []

  return (
    <div className="practice-problem">
      <div className="problem-header">
        <div className="problem-meta">
          <span className="subject-badge">{problem.subject}</span>
          {problem.topic && <span className="topic-badge">{problem.topic}</span>}
          {problem.difficulty_level && (
            <span className={`difficulty-badge difficulty-${problem.difficulty_level}`}>
              Level {problem.difficulty_level}
            </span>
          )}
        </div>
        {problem.assigned_at && (
          <div className="assigned-date">
            Assigned: {new Date(problem.assigned_at).toLocaleDateString()}
          </div>
        )}
      </div>

      <div className="problem-content">
        <h3>Practice Problem</h3>
        <div className="question-text">
          <MathRenderer text={problem.problem_content?.question || 'No question available'} />
        </div>

        {isMultipleChoice && options.length > 0 && (
          <div className="options-list">
            {options.map((option, idx) => {
              const optionLabel = String.fromCharCode(65 + idx) // A, B, C, D
              const isSelected = selectedOption === option
              const isCorrect = isCompleted && problem.is_correct && problem.student_answer === option
              const isIncorrect = isCompleted && !problem.is_correct && problem.student_answer === option
              const showCorrect = isCompleted && problem.correct_answer === option

              return (
                <label
                  key={idx}
                  className={`option-item ${isSelected ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isIncorrect ? 'incorrect' : ''} ${showCorrect ? 'show-correct' : ''}`}
                >
                  <input
                    type="radio"
                    name="answer"
                    value={option}
                    checked={selectedOption === option}
                    onChange={(e) => setSelectedOption(e.target.value)}
                    disabled={isCompleted}
                  />
                  <span className="option-label">{optionLabel}.</span>
                  <span className="option-text">
                    <MathRenderer text={option} />
                  </span>
                  {showCorrect && !isCorrect && <span className="correct-indicator">✓ Correct Answer</span>}
                </label>
              )
            })}
          </div>
        )}

        {!isMultipleChoice && (
          <div className="answer-input">
            <label>
              Your Answer:
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer here..."
                rows={isCompleted ? 3 : 6}
                disabled={isCompleted}
              />
            </label>
          </div>
        )}

        {problem.problem_content?.hints && problem.problem_content.hints.length > 0 && !isCompleted && (
          <div className="hints-section">
            <details>
              <summary>💡 Hints</summary>
              <ul>
                {problem.problem_content.hints.map((hint, idx) => (
                  <li key={idx}><MathRenderer text={hint} /></li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>

      {!isCompleted && (
        <form onSubmit={handleSubmit} className="submit-form">
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={submitting || (!answer && !selectedOption)}>
            {submitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        </form>
      )}

      {isCompleted && problem.is_correct && (
        <div className="correct-answer-message">
          <span className="correct-icon">✓</span>
          <span className="correct-text">Correct Answer!</span>
        </div>
      )}

      {isCompleted && feedback && (
        <div className={`feedback-section ${problem.is_correct ? 'correct' : 'incorrect'}`}>
          <div className="feedback-header">
            <h4>{problem.is_correct ? '✓ Correct!' : '✗ Incorrect'}</h4>
            <div className="attempts">Attempts: {problem.attempts_count}</div>
          </div>
          
          {feedback.feedback && (
            <div className="feedback-text">
              <MathRenderer text={feedback.feedback} />
            </div>
          )}
          
          {feedback.explanation && (
            <div className="explanation">
              <h5>Explanation:</h5>
              <p><MathRenderer text={feedback.explanation} /></p>
            </div>
          )}
          
          {feedback.common_mistakes && feedback.common_mistakes.length > 0 && (
            <div className="common-mistakes">
              <h5>Common Mistakes:</h5>
              <ul>
                {feedback.common_mistakes.map((mistake, idx) => (
                  <li key={idx}><MathRenderer text={mistake} /></li>
                ))}
              </ul>
            </div>
          )}
          
          {feedback.suggestions && feedback.suggestions.length > 0 && (
            <div className="suggestions">
              <h5>Suggestions:</h5>
              <ul>
                {feedback.suggestions.map((suggestion, idx) => (
                  <li key={idx}><MathRenderer text={suggestion} /></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {isCompleted && problem.solution_steps && (
        <div className="solution-section">
          <h4>Solution Steps</h4>
          {Array.isArray(problem.solution_steps) ? (
            <ol>
              {problem.solution_steps.map((step, idx) => (
                <li key={idx}><MathRenderer text={step} /></li>
              ))}
            </ol>
          ) : (
            <div><MathRenderer text={problem.solution_steps} /></div>
          )}
        </div>
      )}
    </div>
  )
}

export default PracticeProblem

