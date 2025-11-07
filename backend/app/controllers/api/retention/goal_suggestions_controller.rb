module Api
  module Retention
    class GoalSuggestionsController < BaseController
      def index
        goal = current_student.goals.find(params[:goal_id])
        suggestions = goal.goal_suggestions.order(created_at: :desc)

        render json: {
          suggestions: suggestions.map { |s| suggestion_json(s) }
        }
      end

      def accept
        suggestion = current_student.goal_suggestions.find(params[:id])
        suggestion.accept!

        render json: {
          message: 'Suggestion accepted',
          suggestion: suggestion_json(suggestion)
        }
      end

      private

      def suggestion_json(suggestion)
        {
          id: suggestion.id,
          suggested_subject: suggestion.suggested_subject,
          suggested_goal_type: suggestion.suggested_goal_type,
          reasoning: suggestion.reasoning,
          confidence: suggestion.confidence,
          presented_at: suggestion.presented_at,
          accepted_at: suggestion.accepted_at
        }
      end
    end
  end
end

