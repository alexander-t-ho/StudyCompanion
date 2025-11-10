module Api
  module V1
    module Retention
      class ProgressHistoryController < BaseController
        def show
          goal_id = params[:goal_id]
          
          if goal_id
            # Get history for specific goal
            goal = current_student.goals.find(goal_id)
            snapshots = goal.goal_progress_snapshots.order(snapshot_date: :asc)
            
            render json: {
              goal: {
                id: goal.id,
                title: goal.title,
                subject: goal.subject
              },
              snapshots: snapshots.map { |s| snapshot_json(s) },
              trend: calculate_trend(snapshots)
            }
          else
            # Get history for all goals
            snapshots = GoalProgressSnapshot.for_student(current_student.id)
                                          .includes(:goal)
                                          .order(snapshot_date: :desc)
                                          .limit(100)
            
            render json: {
              snapshots: snapshots.map { |s| snapshot_json(s) }
            }
          end
        end

        private

        def snapshot_json(snapshot)
          {
            id: snapshot.id,
            goal_id: snapshot.goal_id,
            goal_title: snapshot.goal.title,
            goal_subject: snapshot.goal.subject,
            completion_percentage: snapshot.completion_percentage,
            milestones_completed: snapshot.milestones_completed,
            estimated_completion_date: snapshot.estimated_completion_date,
            snapshot_date: snapshot.snapshot_date,
            created_at: snapshot.created_at
          }
        end

        def calculate_trend(snapshots)
          return nil if snapshots.count < 2

          recent = snapshots.last(7) # Last 7 snapshots
          return nil if recent.count < 2

          first_percentage = recent.first.completion_percentage || 0
          last_percentage = recent.last.completion_percentage || 0
          
          change = last_percentage - first_percentage
          days = (recent.last.snapshot_date - recent.first.snapshot_date).to_i
          daily_change = days > 0 ? (change / days).round(2) : 0

          {
            change: change.round(2),
            daily_change: daily_change,
            direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
            period_days: days
          }
        end
      end
    end
  end
end


