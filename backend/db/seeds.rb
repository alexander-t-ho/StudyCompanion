# Seed data for development/testing

# Create a test student with AI companion enabled
student = Student.find_or_create_by(email: 'test@example.com') do |s|
  s.name = 'Test Student'
  s.ai_companion_enabled = true
  s.authentication_token = SecureRandom.hex(32)
end

puts "Created student: #{student.email}"
puts "Authentication token: #{student.authentication_token}"

# Create AI companion profile
profile = student.ensure_ai_companion_profile
puts "Created AI companion profile for student #{student.id}"

# Create a test session
session = Session.find_or_create_by(student_id: student.id, subject: 'SAT Math') do |s|
  s.topic = 'Algebra'
  s.status = 'completed'
  s.scheduled_at = 1.day.ago
  s.started_at = 1.day.ago
  s.ended_at = 1.day.ago + 1.hour
  s.duration_minutes = 60
end

puts "Created session: #{session.id}"

# Create a test goal
goal = Goal.find_or_create_by(student_id: student.id, subject: 'SAT Math') do |g|
  g.title = 'SAT Math Prep'
  g.description = 'Prepare for SAT Math section'
  g.status = 'active'
  g.progress_percentage = 50
end

puts "Created goal: #{goal.id}"

puts "\nSeed data created successfully!"
puts "\nTo use the API, include this header:"
puts "Authorization: Bearer #{student.authentication_token}"
puts "\nOr use student_id parameter: student_id=#{student.id}"

