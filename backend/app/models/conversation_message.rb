class ConversationMessage < ApplicationRecord
  belongs_to :student
  belongs_to :ai_companion_profile, optional: true
  belongs_to :session, optional: true
  belongs_to :session_summary, optional: true

  has_many_attached :images

  validates :role, inclusion: { in: %w[user assistant] }
  validates :content, presence: true

  scope :for_student, ->(student_id) { where(student_id: student_id) }
  scope :recent, -> { order(created_at: :desc) }
  scope :user_messages, -> { where(role: 'user') }
  scope :assistant_messages, -> { where(role: 'assistant') }

  def user?
    role == 'user'
  end

  def assistant?
    role == 'assistant'
  end

  def context_hash
    context || {}
  end

  def image_urls
    return [] unless images.attached?
    
    images.map do |image|
      # Use Active Storage service URL
      Rails.application.routes.url_helpers.rails_blob_path(image, only_path: false)
    rescue => e
      Rails.logger.error "Failed to generate image URL: #{e.message}"
      # Fallback to service URL if route helper fails
      begin
        image.service_url
      rescue
        nil
      end
    end.compact
  end
end

