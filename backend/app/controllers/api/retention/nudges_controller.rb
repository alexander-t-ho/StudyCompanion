module Api
  module V1
    module Retention
      class NudgesController < BaseController
      def eligibility
        service = NudgeService.new(current_student)
        details = service.eligibility_details

        render json: {
          eligible: details[:eligible],
          details: details,
          suggested_nudge: details[:eligible] ? {
            message: service.generate_nudge_message,
            nudge_type: 'day_7_reminder'
          } : nil
        }
      end

      def send
        delivery_channel = params[:delivery_channel] || 'in_app'
        
        unless %w[in_app email push].include?(delivery_channel)
          render json: { error: 'Invalid delivery channel' }, status: :bad_request
          return
        end

        service = NudgeService.new(current_student)
        result = service.send_nudge(delivery_channel)

        if result[:success]
          render json: {
            success: true,
            message: 'Nudge sent successfully',
            nudge: nudge_json(result[:nudge])
          }
        else
          render json: {
            success: false,
            reason: result[:reason],
            details: service.eligibility_details
          }, status: :unprocessable_entity
        end
      end

      # Get all nudges for the student
      def index
        nudges = current_student.early_engagement_nudges.order(created_at: :desc)

        render json: {
          nudges: nudges.map { |n| nudge_json(n) }
        }
      end

      # Mark nudge as opened
      def mark_opened
        nudge = current_student.early_engagement_nudges.find(params[:id])
        nudge.mark_opened!

        render json: {
          success: true,
          nudge: nudge_json(nudge)
        }
      end

      # Mark nudge as clicked
      def mark_clicked
        nudge = current_student.early_engagement_nudges.find(params[:id])
        nudge.mark_clicked!

        render json: {
          success: true,
          nudge: nudge_json(nudge)
        }
      end

      private

      def nudge_json(nudge)
        {
          id: nudge.id,
          nudge_type: nudge.nudge_type,
          message: nudge.message,
          delivery_channel: nudge.delivery_channel,
          sent_at: nudge.sent_at,
          opened_at: nudge.opened_at,
          clicked_at: nudge.clicked_at,
          session_booked: nudge.session_booked,
          session_id: nudge.session_id,
          created_at: nudge.created_at
        }
      end
    end
  end
  end
end

