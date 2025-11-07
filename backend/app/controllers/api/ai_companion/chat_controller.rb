module Api
  module AiCompanion
    class ChatController < BaseController
      def create
        # Stub for Core AI Companion implementation
        render json: {
          message: 'Chat endpoint - to be implemented in Core AI Companion PRD',
          status: 'stub'
        }
      end

      def history
        # Stub for Core AI Companion implementation
        messages = current_student.conversation_messages
          .order(created_at: :desc)
          .limit(50)
          .reverse

        render json: {
          messages: messages.map { |m| message_json(m) }
        }
      end

      private

      def message_json(message)
        {
          id: message.id,
          role: message.role,
          content: message.content,
          created_at: message.created_at
        }
      end
    end
  end
end

