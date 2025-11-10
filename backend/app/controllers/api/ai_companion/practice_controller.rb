module Api
  module AiCompanion
    class PracticeController < BaseController
      def generate
        student = current_student
        return if performed? # Already rendered error in authenticate_student!
        
        api_key = params[:api_key] || ENV['OPENAI_API_KEY']
        use_openrouter = params[:use_openrouter] == 'true' || ENV['USE_OPENROUTER'] == 'true'
        
        # Validate subject exists in student's transcripts
        subject = params[:subject]
        if subject.blank?
          return render json: { error: 'Subject is required' }, status: :unprocessable_entity
        end
        
        # Check if student has transcripts for this subject
        unless student.transcripts.where(subject: subject).exists?
          available_subjects = student.transcripts.where.not(subject: nil).distinct.pluck(:subject).sort
          return render json: { 
            error: "Subject '#{subject}' not found in your tutoring sessions. Available subjects: #{available_subjects.join(', ')}",
            available_subjects: available_subjects
          }, status: :unprocessable_entity
        end
        
        begin
          service = PracticeGenerationService.new(
            api_key: api_key,
            use_openrouter: use_openrouter
          )
          
          result = service.generate_problem(
            student: student,
            subject: subject,
            topic: params[:topic],
            difficulty: params[:difficulty]&.to_i,
            goal_id: params[:goal_id]&.to_i
          )
          
          render json: {
            problem: problem_json(result[:problem]),
            generation_metadata: {
              model_used: result[:model_used],
              token_count: result[:token_count],
              cost: result[:cost]
            }
          }, status: :created
        rescue => e
          Rails.logger.error "Practice generation error: #{e.message}\n#{e.backtrace.join("\n")}"
          render json: { error: e.message }, status: :unprocessable_entity
        end
      end

      def index
        student = current_student
        return if performed? # Already rendered error in authenticate_student!
        
        begin
          problems = student.practice_problems
            .order(assigned_at: :desc)
            .limit(20)

          render json: {
            problems: problems.map { |p| problem_json(p) }
          }
        rescue => e
          Rails.logger.error "Practice index error: #{e.message}\n#{e.backtrace.join("\n")}"
          render json: { 
            error: 'Failed to load practice problems',
            message: e.message 
          }, status: :internal_server_error
        end
      end

      # Get available subjects from student's transcripts
      def available_subjects
        student = current_student
        return if performed? # Already rendered error in authenticate_student!
        
        begin
          # Get unique subjects from transcripts
          subjects = student.transcripts
            .where.not(subject: nil)
            .distinct
            .pluck(:subject)
            .sort

          render json: {
            subjects: subjects,
            count: subjects.count
          }
        rescue => e
          Rails.logger.error "Available subjects error: #{e.message}\n#{e.backtrace.join("\n")}"
          render json: { 
            error: 'Failed to load available subjects',
            message: e.message 
          }, status: :internal_server_error
        end
      end

      def show
        problem = current_student.practice_problems.find(params[:id])
        render json: problem_json(problem)
      end

      def submit
        student = current_student
        problem = student.practice_problems.find(params[:id])
        
        return render json: { error: 'Problem already completed' }, status: :unprocessable_entity if problem.completed?
        
        student_answer = params[:answer] || params[:student_answer]
        return render json: { error: 'Answer is required' }, status: :unprocessable_entity if student_answer.blank?
        
        api_key = params[:api_key] || ENV['OPENAI_API_KEY']
        use_openrouter = params[:use_openrouter] == 'true' || ENV['USE_OPENROUTER'] == 'true'
        
        service = PracticeGenerationService.new(
          api_key: api_key,
          use_openrouter: use_openrouter
        )
        
        feedback = service.provide_feedback(problem, student_answer)
        
        # Update practice problem
        problem.submit_answer!(
          student_answer,
          feedback[:is_correct],
          feedback[:feedback]
        )
        
        render json: {
          problem: problem_json(problem.reload),
          feedback: feedback
        }
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Practice problem not found' }, status: :not_found
      rescue => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      private

      def problem_json(problem)
        {
          id: problem.id,
          subject: problem.subject,
          topic: problem.topic,
          difficulty_level: problem.difficulty_level,
          problem_content: problem.problem_content,
          correct_answer: problem.completed? ? problem.correct_answer : nil, # Only show answer if completed
          solution_steps: problem.completed? ? problem.solution_steps : nil,
          assigned_at: problem.assigned_at,
          completed_at: problem.completed_at,
          is_correct: problem.is_correct,
          student_answer: problem.completed? ? problem.student_answer : nil,
          feedback: problem.feedback,
          attempts_count: problem.attempts_count
        }
      end
    end
  end
end

