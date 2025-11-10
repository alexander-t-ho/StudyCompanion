module Api
  module V1
    module Retention
      class ProgressDashboardController < BaseController
      def show
        goals = current_student.goals.active
        completed_goals = current_student.goals.completed
        all_goals = current_student.goals

        # Calculate aggregate statistics
        total_sessions = current_student.sessions.completed.count
        recent_sessions = current_student.sessions.completed.where('ended_at > ?', 7.days.ago).count
        
        # Calculate average progress across active goals
        avg_progress = goals.any? ? (goals.sum(:progress_percentage).to_f / goals.count).round(2) : 0

        # Get subject relationships for visualization
        subject_relationships = build_subject_relationship_map(all_goals)

        render json: {
          active_goals: goals.map { |g| goal_json(g) },
          completed_goals: completed_goals.map { |g| goal_json(g) },
          total_goals: all_goals.count,
          active_count: goals.count,
          completed_count: completed_goals.count,
          average_progress: avg_progress,
          total_sessions: total_sessions,
          recent_sessions: recent_sessions,
          subject_relationships: subject_relationships,
          summary: {
            total_goals: all_goals.count,
            active_goals: goals.count,
            completed_goals: completed_goals.count,
            average_progress: avg_progress,
            total_sessions: total_sessions
          }
        }
      end

      def insights
        student = current_student
        goals = student.goals
        active_goals = goals.active
        completed_goals = goals.completed
        sessions = student.sessions.completed

        insights = []

        # Progress velocity insights
        if active_goals.any?
          avg_progress = active_goals.sum(:progress_percentage).to_f / active_goals.count
          if avg_progress > 70
            insights << {
              type: 'progress_velocity',
              message: "You're making excellent progress! You're #{avg_progress.round}% complete on average across your goals.",
              priority: 'high'
            }
          elsif avg_progress > 50
            insights << {
              type: 'progress_velocity',
              message: "You're halfway there! Keep up the momentum on your active goals.",
              priority: 'medium'
            }
          end
        end

        # Multi-goal achievement
        if completed_goals.count >= 3
          insights << {
            type: 'achievement',
            message: "Amazing! You've completed #{completed_goals.count} goals. You're building great momentum!",
            priority: 'high'
          }
        end

        # Session engagement
        recent_sessions = sessions.where('ended_at > ?', 7.days.ago).count
        if recent_sessions >= 3
          insights << {
            type: 'engagement',
            message: "Great engagement! You've had #{recent_sessions} sessions in the past week.",
            priority: 'high'
          }
        elsif recent_sessions == 0 && active_goals.any?
          insights << {
            type: 'engagement',
            message: "Consider booking a session to continue your progress on your active goals.",
            priority: 'medium'
          }
        end

        # Subject relationships
        if completed_goals.any? && active_goals.any?
          completed_subjects = completed_goals.pluck(:subject)
          active_subjects = active_goals.pluck(:subject)
          
          # Check if any active goals relate to completed goals
          related_count = 0
          completed_subjects.each do |completed_subject|
            related_subjects = SubjectRelationship.related_subjects(completed_subject)
            related_count += (related_subjects & active_subjects).count
          end

          if related_count > 0
            insights << {
              type: 'subject_relationships',
              message: "You're building on your previous success! Your current goals connect to subjects you've already mastered.",
              priority: 'medium'
            }
          end
        end

        # Goal completion streak
        recent_completions = completed_goals.where('completed_at > ?', 30.days.ago).count
        if recent_completions >= 2
          insights << {
            type: 'streak',
            message: "You're on a roll! #{recent_completions} goals completed in the past month.",
            priority: 'high'
          }
        end

        render json: {
          insights: insights,
          generated_at: Time.current
        }
      end

      private

      def goal_json(goal)
        # Calculate days until target (if target_date exists)
        days_remaining = goal.target_date ? (goal.target_date - Date.current).to_i : nil
        
        # Get related sessions count
        related_sessions = current_student.sessions.completed.where(subject: goal.subject).count

        {
          id: goal.id,
          subject: goal.subject,
          title: goal.title,
          description: goal.description,
          status: goal.status,
          progress_percentage: goal.progress_percentage,
          target_date: goal.target_date,
          days_remaining: days_remaining,
          completed_at: goal.completed_at,
          created_at: goal.created_at,
          related_sessions_count: related_sessions,
          metadata: goal.metadata
        }
      end

      def build_subject_relationship_map(goals)
        # Build a map of subject relationships for goals
        relationships = []
        goal_subjects = goals.pluck(:subject).uniq

        goal_subjects.each do |subject|
          related = SubjectRelationship.for_subject(subject).limit(5)
          related.each do |rel|
            # Only include if the related subject is also in the student's goals
            if goal_subjects.include?(rel.target_subject)
              relationships << {
                source: subject,
                target: rel.target_subject,
                type: rel.relationship_type,
                strength: rel.strength
              }
            end
          end
        end

        relationships
      end
    end
  end
  end
end

