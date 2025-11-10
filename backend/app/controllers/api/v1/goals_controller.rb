module Api
  module V1
    class GoalsController < ApplicationController
      before_action :authenticate_student!

      def index
        goals = current_student.goals.order(created_at: :desc)
        
        # Filter by goal_type
        if params[:goal_type].present?
          goals = goals.where(goal_type: params[:goal_type])
        end
        
        # Filter by parent_goal_id
        if params[:parent_goal_id].present?
          goals = goals.where(parent_goal_id: params[:parent_goal_id])
        end
        
        # Filter by subject
        if params[:subject].present?
          goals = goals.where(subject: params[:subject])
        end
        
        # Group by subject if requested
        if params[:group_by] == 'subject'
          grouped = goals.group_by(&:subject)
          render json: { 
            goals_by_subject: grouped.transform_values { |g| g.map { |goal| goal_json(goal) } }
          }
        else
        render json: { goals: goals.map { |g| goal_json(g) } }
        end
      end

      def show
        goal = current_student.goals.find(params[:id])
        render json: { goal: goal_json(goal) }
      end

      def create
        goal = current_student.goals.build(goal_params)
        
        if goal.save
          render json: { goal: goal_json(goal) }, status: :created
        else
          render json: { errors: goal.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        goal = current_student.goals.find(params[:id])
        
        if goal.update(goal_params)
          render json: { goal: goal_json(goal) }
        else
          render json: { errors: goal.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        goal = current_student.goals.find(params[:id])
        goal.destroy
        render json: { message: 'Goal deleted successfully' }
      end

      def recalculate_progress
        goal = current_student.goals.find(params[:id])
        
        unless goal.long_term?
          return render json: { error: 'Progress recalculation only available for long-term goals' }, status: :bad_request
        end

        service = LongTermGoalProgressService.new(goal.id)
        progress = service.calculate_and_update
        
        render json: { 
          goal: goal_json(goal.reload),
          progress: progress
        }
      end

      def suggestions
        subject = params[:subject]
        api_key = params[:api_key] || ENV['OPENAI_API_KEY']
        use_openrouter = params[:use_openrouter] == 'true' || ENV['USE_OPENROUTER'] == 'true'
        
        service = ShortTermGoalSuggestionService.new(
          current_student.id, 
          subject,
          api_key: api_key,
          use_openrouter: use_openrouter
        )
        
        result = if subject.present?
          service.suggestions_for_subject(subject)
        else
          service.all_suggestions
        end
        
        # Handle new format: { to_update: [...], to_create: [...] }
        if result.is_a?(Hash) && result.key?(:to_update)
          render json: { 
            suggestions: {
              to_create: result[:to_create] || [],
              to_update: result[:to_update] || []
            }
          }
        else
          # Fallback for old format (array)
          render json: { suggestions: result || [] }
        end
      end

      private

      def goal_params
        params.require(:goal).permit(:subject, :goal_type, :title, :description, :status, :target_date, :progress_percentage, :completed_at, :parent_goal_id, metadata: {})
      end

      def goal_json(goal)
        {
          id: goal.id,
          subject: goal.subject,
          goal_type: goal.goal_type,
          title: goal.title,
          description: goal.description,
          status: goal.status,
          target_date: goal.target_date,
          completed_at: goal.completed_at,
          progress_percentage: goal.progress_percentage,
          parent_goal_id: goal.parent_goal_id,
          parent_goal: goal.parent_goal ? {
            id: goal.parent_goal.id,
            title: goal.parent_goal.title
          } : nil,
          child_goals_count: goal.child_goals.count,
          metadata: goal.metadata,
          created_at: goal.created_at,
          updated_at: goal.updated_at
        }
      end

      def authenticate_student!
        token = request.headers['Authorization']&.gsub(/^Bearer /, '')
        
        if token.present?
          student = Student.find_by(authentication_token: token)
          return student if student
        end

        if params[:student_id].present?
          student = Student.find_by(id: params[:student_id])
          return student if student
        end

        render json: { error: 'Unauthorized' }, status: :unauthorized
        nil
      end

      def current_student
        @current_student ||= authenticate_student!
      end
    end
  end
end

