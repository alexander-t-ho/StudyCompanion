class AbTestVariation < ApplicationRecord
  belongs_to :student

  validates :test_name, presence: true
  validates :variation_name, presence: true
  validates :assigned_at, presence: true

  scope :active, -> { where(is_active: true) }
  scope :by_test, ->(test_name) { where(test_name: test_name) }
  scope :by_variation, ->(variation_name) { where(variation_name: variation_name) }

  def self.assign_variation(student:, test_name:, variations: ['control', 'variant_a'])
    # Check if student already has an active variation for this test
    existing = active.find_by(student: student, test_name: test_name)
    return existing if existing

    # Simple random assignment (can be made more sophisticated)
    variation_name = variations.sample
    
    create!(
      student: student,
      test_name: test_name.to_s,
      variation_name: variation_name.to_s,
      assigned_at: Time.current,
      is_active: true
    )
  end

  def end_test!
    update!(is_active: false, ended_at: Time.current)
  end
end


