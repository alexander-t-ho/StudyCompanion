module Api
  module V1
    module AiCompanion
      class ProfileController < BaseController
        def show
          student = current_student
          return if performed? # Already rendered error in authenticate_student!
          
          profile = student.ensure_ai_companion_profile
          
          render json: {
            student_id: student.id,
            total_interactions: profile.total_interactions_count,
            last_interaction_at: profile.last_interaction_at,
            learning_preferences: profile.learning_preferences_hash,
            enabled: profile.enabled
          }
        end

        def update
          student = current_student
          return if performed? # Already rendered error in authenticate_student!
          
          profile = student.ensure_ai_companion_profile
          
          if profile.update(profile_params)
            render json: {
              message: 'Profile updated successfully',
              profile: {
                learning_preferences: profile.learning_preferences_hash,
                enabled: profile.enabled
              }
            }
          else
            render json: { errors: profile.errors.full_messages }, status: :unprocessable_entity
          end
        end

        private

        def profile_params
          params.require(:profile).permit(:enabled, learning_preferences: {})
        end
      end
    end
  end
end


