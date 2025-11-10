module Api
  module V1
    class UnderstandingLevelsController < ApplicationController
      before_action :set_student

      # GET /api/v1/students/:student_id/understanding-levels
      def index
        service = UnderstandingLevelAnalyticsService.new(student_id: @student.id)
        
        if params[:subject].present?
          levels = service.levels_for_subject(params[:subject])
          render json: {
            student_id: @student.id,
            subject: params[:subject],
            levels: levels.map { |t| level_json(t) }
          }
        else
          levels = service.all_levels
          render json: {
            student_id: @student.id,
            levels: levels.map { |t| level_json(t) }
          }
        end
      end

      # GET /api/v1/students/:student_id/understanding-levels/summary
      def summary
        service = UnderstandingLevelAnalyticsService.new(student_id: @student.id)
        summary_data = service.summary
        
        render json: {
          student_id: @student.id,
          summary: summary_data
        }
      end

      # GET /api/v1/students/:student_id/understanding-levels/:subject/progression
      def progression
        service = UnderstandingLevelAnalyticsService.new(student_id: @student.id)
        progression_data = service.progression_for_subject(params[:subject])
        
        render json: {
          student_id: @student.id,
          progression: progression_data
        }
      end

      # GET /api/v1/students/:student_id/understanding-levels/all-subjects
      def all_subjects
        service = UnderstandingLevelAnalyticsService.new(student_id: @student.id)
        summaries = service.all_subjects_summary
        
        render json: {
          student_id: @student.id,
          subjects: summaries
        }
      end

      private

      def set_student
        # In a real app, this would use authentication
        # For now, we'll use student_id from params
        student_id = params[:student_id] || params[:id]
        @student = Student.find(student_id)
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Student not found' }, status: :not_found
      end

      def level_json(transcript)
        {
          transcript_id: transcript.id,
          subject: transcript.subject,
          topic: transcript.topic,
          session_date: transcript.session_date,
          understanding_level: transcript.understanding_level,
          previous_understanding_level: transcript.previous_understanding_level,
          progress: transcript.previous_understanding_level ? 
            (transcript.understanding_level - transcript.previous_understanding_level).round(2) : nil,
          created_at: transcript.created_at
        }
      end
    end
  end
end

