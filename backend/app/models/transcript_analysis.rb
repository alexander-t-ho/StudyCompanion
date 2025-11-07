class TranscriptAnalysis < ApplicationRecord
  belongs_to :transcript

  validates :engagement_score, inclusion: { in: 0..100 }, allow_nil: true

  scope :validated, -> { where(validated: true) }
  scope :pending_validation, -> { where(validated: false) }

  def approve!
    update(validated: true)
  end

  def sentiment_analysis_hash
    sentiment_analysis || {}
  end

  def concept_extraction_hash
    concept_extraction || {}
  end

  def engagement_metrics_hash
    engagement_metrics || {}
  end
end

