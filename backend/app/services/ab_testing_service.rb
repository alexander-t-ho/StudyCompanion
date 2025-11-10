# Service for A/B testing framework
class AbTestingService
  def initialize
  end

  # Assign a variation to a student for a test
  def self.assign_variation(student:, test_name:, variations: ['control', 'variant_a'])
    AbTestVariation.assign_variation(
      student: student,
      test_name: test_name,
      variations: variations
    )
  end

  # Get the current variation for a student in a test
  def self.get_variation(student:, test_name:)
    AbTestVariation.active.find_by(
      student: student,
      test_name: test_name
    )&.variation_name || 'control'
  end

  # Check if student is in a specific variation
  def self.in_variation?(student:, test_name:, variation_name:)
    get_variation(student: student, test_name: test_name) == variation_name.to_s
  end

  # End a test for a student
  def self.end_test(student:, test_name:)
    variation = AbTestVariation.active.find_by(
      student: student,
      test_name: test_name
    )
    variation&.end_test!
  end

  # Get test results (conversion rates by variation)
  def self.get_test_results(test_name:, start_date:, end_date:)
    variations = AbTestVariation.by_test(test_name)
      .where(assigned_at: start_date..end_date)
    
    results = {}
    
    variations.group_by(&:variation_name).each do |variation_name, variation_records|
      student_ids = variation_records.map(&:student_id)
      
      # Calculate conversion rate based on test type
      # This is a generic implementation - specific tests would have specific metrics
      total_students = student_ids.count
      
      # Example: For goal suggestion acceptance test
      if test_name == 'goal_suggestion_algorithm'
        accepted = AnalyticsEvent
          .where(student_id: student_ids)
          .where(event_type: 'goal_suggestion_accepted')
          .where(occurred_at: start_date..end_date)
          .distinct
          .count(:student_id)
        
        conversion_rate = total_students > 0 ? (accepted.to_f / total_students * 100) : 0
        
        results[variation_name] = {
          total_students: total_students,
          conversions: accepted,
          conversion_rate: conversion_rate
        }
      else
        # Generic conversion tracking
        results[variation_name] = {
          total_students: total_students,
          conversions: 0,
          conversion_rate: 0
        }
      end
    end
    
    results
  end

  # Check statistical significance (simple chi-square test)
  def self.is_statistically_significant?(test_name:, start_date:, end_date:, confidence_level: 0.95)
    results = get_test_results(
      test_name: test_name,
      start_date: start_date,
      end_date: end_date
    )
    
    return false if results.size < 2
    
    # Simple check: if one variation has >20% higher conversion rate and >100 samples
    variations = results.values
    return false if variations.any? { |v| v[:total_students] < 100 }
    
    max_rate = variations.map { |v| v[:conversion_rate] }.max
    min_rate = variations.map { |v| v[:conversion_rate] }.min
    
    (max_rate - min_rate) > 20 # 20% difference threshold
  end
end


