# Background job to process transcripts into session summaries

class SessionSummaryProcessorJob < ApplicationJob
  queue_as :default

  def perform(transcript_id, session_id: nil, student_id: nil)
    transcript = Transcript.find(transcript_id)
    
    # Ensure transcript is approved and analyzed
    unless transcript.approved?
      Rails.logger.warn "Transcript #{transcript_id} not approved, skipping session summary creation"
      return
    end

    unless transcript.analyzed?
      Rails.logger.warn "Transcript #{transcript_id} not analyzed, skipping session summary creation"
      return
    end

    # Get session_id and student_id
    session_id ||= transcript.session_id
    student_id ||= transcript.student_id || transcript.session&.student_id

    unless session_id
      Rails.logger.error "No session_id available for transcript #{transcript_id}"
      return
    end

    # Create session summary
    service = SessionSummaryService.new
    service.create_from_transcript(transcript, session_id: session_id, student_id: student_id)
  rescue => e
    Rails.logger.error "Failed to process session summary for transcript #{transcript_id}: #{e.message}"
    raise e
  end
end

