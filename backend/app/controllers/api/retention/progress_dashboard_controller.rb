module Api
  module Retention
    class ProgressDashboardController < BaseController
      def show
        goals = current_student.goals.active
        completed_goals = current_student.goals.completed

        render json: {
          active_goals: goals.map { |g| goal_json(g) },
          completed_goals: completed_goals.map { |g| goal_json(g) },
          total_goals: current_student.goals.count,
          active_count: goals.count,
          completed_count: completed_goals.count
        }
      end

      def insights
        # Stub for Retention Enhancement implementation
        render json: {
          message: 'Progress insights endpoint - to be implemented in Retention Enhancement PRD',
          status: 'stub'
        }
      end

      private

      def goal_json(goal)
        {
          id: goal.id,
          subject: goal.subject,
          title: goal.title,
          status: goal.status,
          progress_percentage: goal.progress_percentage,
          target_date: goal.target_date,
          completed_at: goal.completed_at
        }
      end
    end
  end
end

