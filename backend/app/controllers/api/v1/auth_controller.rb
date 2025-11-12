module Api
  module V1
    class AuthController < ApplicationController
      def login
        username = params[:username]
        password = params[:password]

        Rails.logger.info "Login attempt - Username: #{username.inspect}, Password present: #{password.present?}"

        unless username.present? && password.present?
          Rails.logger.warn "Login failed - Missing username or password"
          return render json: { error: 'Username and password are required' }, status: :bad_request
        end

        begin
          student = Student.find_by(username: username)
          Rails.logger.info "Student found: #{student.present?}, Student ID: #{student&.id}"

          if student && student.authenticate(password)
            # Generate or use existing authentication token
            token = student.authentication_token || SecureRandom.hex(32)
            student.update(authentication_token: token) unless student.authentication_token

            Rails.logger.info "Login successful for student #{student.id}"
            render json: {
              token: token,
              student: {
                id: student.id,
                username: student.username,
                email: student.email,
                name: student.name,
                is_admin: student.is_admin
              }
            }
          else
            Rails.logger.warn "Login failed - Invalid credentials for username: #{username.inspect}"
            render json: { error: 'Invalid username or password' }, status: :unauthorized
          end
        rescue => e
          Rails.logger.error "Login error: #{e.class} - #{e.message}"
          Rails.logger.error e.backtrace.join("\n")
          render json: { error: 'An error occurred during login. Please try again.' }, status: :internal_server_error
        end
      end

      def logout
        # In a stateless JWT system, logout is handled client-side
        # But we can invalidate the token if needed
        if current_student
          current_student.update(authentication_token: nil)
        end
        render json: { message: 'Logged out successfully' }
      end

      private

      def current_student
        token = request.headers['Authorization']&.gsub(/^Bearer /, '')
        return nil unless token.present?
        Student.find_by(authentication_token: token)
      end
    end
  end
end

