class Student < ApplicationRecord
  has_secure_password

  has_one :ai_companion_profile, dependent: :destroy
  has_many :sessions, dependent: :destroy
  has_many :goals, dependent: :destroy
  has_many :transcripts, dependent: :destroy
  has_many :session_summaries, dependent: :destroy
  has_many :conversation_messages, dependent: :destroy
  has_many :practice_problems, dependent: :destroy
  has_many :goal_suggestions, dependent: :destroy
  has_many :early_engagement_nudges, dependent: :destroy
  has_many :tutor_routing_events, dependent: :destroy
  has_many :study_notes, dependent: :destroy

  validates :email, presence: true, uniqueness: true
  validates :username, presence: true, uniqueness: true, if: -> { username.present? }

  scope :with_ai_companion, -> { where(ai_companion_enabled: true) }
  scope :admins, -> { where(is_admin: true) }
  scope :students, -> { where(is_admin: false) }

  def ai_companion_access?
    ai_companion_enabled?
  end

  def ensure_ai_companion_profile
    ai_companion_profile || create_ai_companion_profile
  end

  def admin?
    is_admin?
  end
end

