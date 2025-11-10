module Api
  module V1
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
              goal_id: params[:goal_id]&.to_i,
              session_id: params[:session_id]&.to_i
            )
            
            # Track event and cost
            AnalyticsService.track_event(
              event_type: :practice_generated,
              student: student,
              properties: {
                subject: subject,
                topic: params[:topic],
                difficulty: result[:problem].difficulty_level,
                problem_id: result[:problem].id
              },
              request: request
            )
            
            if result[:cost]
              CostTrackingService.track_cost(
                cost_type: :practice_generation,
                student: student,
                cost: result[:cost],
                model_used: result[:model_used],
                token_count: result[:token_count],
                provider: use_openrouter ? 'openrouter' : 'openai',
                metadata: { problem_id: result[:problem].id, subject: subject }
              )
            end
            
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
            
            # Filter by subject if provided
            if params[:subject].present?
              problems = problems.where(subject: params[:subject])
            end
            
            # Filter by active goals if subject is provided
            # Only show practice problems related to active goals in that subject
            if params[:subject].present?
              active_goal_ids = student.goals
                                       .where(subject: params[:subject], status: 'active')
                                       .pluck(:id)
              
              # Filter to only show problems with goal_id in active goals OR no goal_id (general practice)
              # This allows both goal-specific and general practice problems
              if active_goal_ids.any?
                problems = problems.where('goal_id IS NULL OR goal_id IN (?)', active_goal_ids)
              else
                # If no active goals, only show general practice (no goal_id)
                problems = problems.where(goal_id: nil)
              end
            end
            
            # Filter by specific goal_id if provided
            if params[:goal_id].present?
              problems = problems.where(goal_id: params[:goal_id])
            end
            
            problems = problems.limit(20)

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
          student = current_student
          return if performed? # Already rendered error in authenticate_student!
          
          begin
            problem = student.practice_problems.find(params[:id])
            render json: problem_json(problem)
          rescue ActiveRecord::RecordNotFound
            render json: { error: 'Practice problem not found' }, status: :not_found
          rescue => e
            Rails.logger.error "Practice show error: #{e.message}\n#{e.backtrace.join("\n")}"
            render json: { error: e.message }, status: :internal_server_error
          end
        end

        def submit
          student = current_student
          return if performed? # Already rendered error in authenticate_student!
          
          begin
            problem = student.practice_problems.find(params[:id])
            
            return render json: { error: 'Problem already completed' }, status: :unprocessable_entity if problem.completed?
            
            student_answer = params[:answer] || params[:student_answer]
            return render json: { error: 'Answer is required' }, status: :unprocessable_entity if student_answer.blank?
            
            api_key = params[:api_key] || ENV['OPENAI_API_KEY']
            use_openrouter = params[:use_openrouter] == 'true' || ENV['USE_OPENROUTER'] == 'true'
            
            # Check if API key is available for feedback generation
            unless api_key.present?
              return render json: { 
                error: 'API key is required for feedback generation',
                message: 'Please provide an OpenAI API key to get feedback on your answer'
              }, status: :unprocessable_entity
            end
            
            service = PracticeGenerationService.new(
              api_key: api_key,
              use_openrouter: use_openrouter
            )
            
            # Generate feedback with error handling
            begin
              feedback = service.provide_feedback(problem, student_answer)
            rescue => feedback_error
              Rails.logger.error "Feedback generation error: #{feedback_error.message}\n#{feedback_error.backtrace.join("\n")}"
              # Fallback to simple answer checking if feedback generation fails
              is_correct = service.check_answer_simple(problem, student_answer)
              feedback = {
                is_correct: is_correct,
                feedback: is_correct ? 'Correct!' : 'Incorrect. Please review the solution.',
                explanation: '',
                common_mistakes: [],
                suggestions: []
              }
            end
              
            # Update practice problem
            problem.submit_answer!(
              student_answer,
              feedback[:is_correct],
              feedback[:feedback]
            )
              
              # Track events (wrap in rescue to prevent analytics errors from breaking submission)
              begin
                AnalyticsService.track_event(
                  event_type: :practice_submitted,
                  student: student,
                  properties: {
                    problem_id: problem.id,
                    subject: problem.subject,
                    difficulty: problem.difficulty_level
                  },
                  request: request
                )
                
                if feedback[:is_correct]
                  AnalyticsService.track_event(
                    event_type: :practice_correct,
                    student: student,
                    properties: {
                      problem_id: problem.id,
                      subject: problem.subject
                    },
                    request: request
                  )
                else
                  AnalyticsService.track_event(
                    event_type: :practice_incorrect,
                    student: student,
                    properties: {
                      problem_id: problem.id,
                      subject: problem.subject
                    },
                    request: request
                  )
                end
                
                if problem.completed?
                  AnalyticsService.track_event(
                    event_type: :practice_completed,
                    student: student,
                    properties: {
                      problem_id: problem.id,
                      subject: problem.subject,
                      is_correct: feedback[:is_correct]
                    },
                    request: request
                  )
                end
              rescue => analytics_error
                Rails.logger.warn "Analytics tracking failed: #{analytics_error.message}"
                # Don't fail the request if analytics fails
              end
              
              # Note: Cost tracking for feedback would need to be added to PracticeGenerationService.provide_feedback
              # For now, we track the event but not the cost separately
              
              render json: {
                problem: problem_json(problem.reload),
                feedback: feedback
              }
          rescue ActiveRecord::RecordNotFound
            render json: { error: 'Practice problem not found' }, status: :not_found
          rescue ActiveRecord::RecordInvalid => e
            Rails.logger.error "Practice submit validation error: #{e.message}\n#{e.record.errors.full_messages.join(', ')}"
            render json: { 
              error: 'Validation failed', 
              message: e.message,
              errors: e.record.errors.full_messages 
            }, status: :unprocessable_entity
          rescue => e
            Rails.logger.error "Practice submit error: #{e.message}\n#{e.backtrace.join("\n")}"
            render json: { 
              error: e.message,
              message: e.message,
              backtrace: Rails.env.development? ? e.backtrace.first(5) : nil
            }, status: :unprocessable_entity
          end
        end

        private

        def problem_json(problem)
          # Extract correct_answer from JSONB format
          correct_answer_display = nil
          if problem.completed? && problem.correct_answer
            if problem.correct_answer.is_a?(Hash)
              correct_answer_display = problem.correct_answer['answer'] || problem.correct_answer.values.first
            else
              correct_answer_display = problem.correct_answer
            end
          end
          
          # Extract student_answer from JSONB format
          student_answer_display = nil
          if problem.completed? && problem.student_answer
            if problem.student_answer.is_a?(Hash)
              student_answer_display = problem.student_answer['answer'] || problem.student_answer.values.first
            else
              student_answer_display = problem.student_answer
            end
          end
          
          {
            id: problem.id,
            subject: problem.subject,
            topic: problem.topic,
            difficulty_level: problem.difficulty_level,
            problem_content: problem.problem_content,
            correct_answer: correct_answer_display,
            solution_steps: problem.completed? ? problem.solution_steps : nil,
            assigned_at: problem.assigned_at,
            completed_at: problem.completed_at,
            is_correct: problem.is_correct,
            student_answer: student_answer_display,
            feedback: problem.feedback,
            attempts_count: problem.attempts_count
          }
        end
      end
    end
  end
end

