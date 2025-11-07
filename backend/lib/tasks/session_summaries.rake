namespace :session_summaries do
  desc "Create session summaries from approved and analyzed transcripts"
  task create_from_transcripts: :environment do
    transcripts = Transcript.approved
      .joins(:transcript_analysis)
      .where.not(session_id: nil)
      .where.not(id: SessionSummary.select(:transcript_id))

    puts "Found #{transcripts.count} transcripts to process"

    transcripts.find_each do |transcript|
      begin
        SessionSummaryProcessorJob.perform_now(
          transcript.id,
          session_id: transcript.session_id,
          student_id: transcript.student_id
        )
        puts "Processed transcript #{transcript.id}"
      rescue => e
        puts "Error processing transcript #{transcript.id}: #{e.message}"
      end
    end

    puts "Done processing transcripts"
  end

  desc "Reprocess failed session summaries"
  task reprocess_failed: :environment do
    failed_summaries = SessionSummary.failed

    puts "Found #{failed_summaries.count} failed summaries to reprocess"

    failed_summaries.find_each do |summary|
      next unless summary.transcript&.approved? && summary.transcript&.analyzed?

      begin
        service = SessionSummaryService.new
        service.create_from_transcript(
          summary.transcript,
          session_id: summary.session_id,
          student_id: summary.student_id
        )
        puts "Reprocessed summary #{summary.id}"
      rescue => e
        puts "Error reprocessing summary #{summary.id}: #{e.message}"
      end
    end

    puts "Done reprocessing failed summaries"
  end
end

