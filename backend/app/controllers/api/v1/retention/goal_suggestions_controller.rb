module Api
  module V1
    module Retention
      class GoalSuggestionsController < BaseController
      def index
        goal = current_student.goals.find(params[:goal_id])
        suggestions = goal.goal_suggestions.order(confidence: :desc, created_at: :desc)

        # If no suggestions exist and goal is completed, generate them
        if suggestions.empty? && goal.completed?
          api_key = params[:api_key] || request.headers['X-API-Key']
          use_openrouter = params[:use_openrouter] == 'true' || request.headers['X-Use-OpenRouter'] == 'true'
          
          service = GoalSuggestionService.new(
            current_student, 
            goal,
            api_key: api_key,
            use_openrouter: use_openrouter
          )
          suggestions = service.generate_suggestions
          suggestions.each(&:present!)
        end

        # Track event
        AnalyticsService.track_event(
          event_type: :goal_suggestion_viewed,
          student: current_student,
          properties: {
            goal_id: goal.id,
            suggestions_count: suggestions.count
          },
          request: request
        )
        
        render json: {
          suggestions: suggestions.map { |s| suggestion_json(s) },
          source_goal: {
            id: goal.id,
            subject: goal.subject,
            title: goal.title,
            status: goal.status
          }
        }
      end

      def accept
        suggestion = current_student.goal_suggestions.find(params[:id])
        
        # Create a new goal from the suggestion
        new_goal = current_student.goals.create!(
          subject: suggestion.suggested_subject,
          goal_type: suggestion.suggested_goal_type,
          title: "#{suggestion.suggested_subject} Goal",
          description: suggestion.reasoning,
          status: 'active',
          progress_percentage: 0
        )

        suggestion.update!(
          accepted_at: Time.current,
          created_goal_id: new_goal.id
        )
        
        # Track event
        AnalyticsService.track_event(
          event_type: :goal_suggestion_accepted,
          student: current_student,
          properties: {
            suggestion_id: suggestion.id,
            suggested_subject: suggestion.suggested_subject,
            created_goal_id: new_goal.id
          },
          request: request
        )

        render json: {
          message: 'Suggestion accepted and goal created',
          suggestion: suggestion_json(suggestion),
          created_goal: {
            id: new_goal.id,
            subject: new_goal.subject,
            title: new_goal.title,
            status: new_goal.status
          }
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
          accepted_at: suggestion.accepted_at,
          created_goal_id: suggestion.created_goal_id,
          source_goal_id: suggestion.source_goal_id
        }
      end
    end
  end
  end
end

