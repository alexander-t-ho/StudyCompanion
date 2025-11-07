module Api
  module AiCompanion
    class PracticeController < BaseController
      def generate
        # Stub for Core AI Companion implementation
        render json: {
          message: 'Practice generation endpoint - to be implemented in Core AI Companion PRD',
          status: 'stub'
        }
      end

      def index
        problems = current_student.practice_problems
          .order(assigned_at: :desc)
          .limit(20)

        render json: {
          problems: problems.map { |p| problem_json(p) }
        }
      end

      def show
        problem = current_student.practice_problems.find(params[:id])
        render json: problem_json(problem)
      end

      def submit
        # Stub for Core AI Companion implementation
        render json: {
          message: 'Practice submission endpoint - to be implemented in Core AI Companion PRD',
          status: 'stub'
        }
      end

      private

      def problem_json(problem)
        {
          id: problem.id,
          subject: problem.subject,
          topic: problem.topic,
          difficulty_level: problem.difficulty_level,
          problem_content: problem.problem_content,
          assigned_at: problem.assigned_at,
          completed_at: problem.completed_at,
          is_correct: problem.is_correct
        }
      end
    end
  end
end

