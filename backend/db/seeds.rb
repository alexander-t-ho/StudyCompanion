# Seed data for development/testing

# Create student1 with credentials
student1 = Student.find_or_create_by(email: 'student1@example.com') do |s|
  s.name = 'Student 1'
  s.username = 'student 1'
  s.password = '123456'
  s.ai_companion_enabled = true
  s.authentication_token = SecureRandom.hex(32)
  s.is_admin = false
end

# Update password if student already exists but doesn't have one
if student1.password_digest.blank?
  student1.update(password: '123456')
end

# Update username if missing
if student1.username.blank?
  student1.update(username: 'student 1')
end

puts "Created/Updated student1: #{student1.email}"
puts "Username: #{student1.username}"
puts "Authentication token: #{student1.authentication_token}"

# Create an admin user
admin = Student.find_or_create_by(email: 'admin@example.com') do |s|
  s.name = 'Admin User'
  s.username = 'admin'
  s.password = '123456'
  s.ai_companion_enabled = true
  s.authentication_token = SecureRandom.hex(32)
  s.is_admin = true
end

# Update password if admin already exists but doesn't have one
if admin.password_digest.blank?
  admin.update(password: '123456')
end

# Always update password to ensure it's set correctly
admin.update(password: '123456')

# Update admin status
admin.update(is_admin: true) unless admin.is_admin?

puts "Created/Updated admin: #{admin.email}"
puts "Username: #{admin.username}"
puts "Authentication token: #{admin.authentication_token}"

# Create a test student with AI companion enabled (legacy)
student = Student.find_or_create_by(email: 'test@example.com') do |s|
  s.name = 'Test Student'
  s.username = 'test'
  s.password = '123456'
  s.ai_companion_enabled = true
  s.authentication_token = SecureRandom.hex(32)
  s.is_admin = false
end

if student.password_digest.blank?
  student.update(password: '123456')
end

# Always update password to ensure it's set correctly
student.update(password: '123456')

puts "Created/Updated test student: #{student.email}"
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

# Seed subject relationships
puts "\nSeeding subject relationships..."

# SAT Prep relationships
[
  { source: 'SAT Prep', target: 'College Essays', type: 'related', strength: 0.9 },
  { source: 'SAT Prep', target: 'Study Skills', type: 'related', strength: 0.8 },
  { source: 'SAT Prep', target: 'AP Prep', type: 'next_level', strength: 0.85 },
  { source: 'SAT Prep', target: 'ACT Prep', type: 'related', strength: 0.7 }
].each do |rel|
  SubjectRelationship.find_or_create_by(
    source_subject: rel[:source],
    target_subject: rel[:target]
  ) do |sr|
    sr.relationship_type = rel[:type]
    sr.strength = rel[:strength]
  end
end

# Chemistry relationships
[
  { source: 'Chemistry', target: 'Physics', type: 'related', strength: 0.85 },
  { source: 'Chemistry', target: 'Biology', type: 'related', strength: 0.8 },
  { source: 'Chemistry', target: 'Advanced Chemistry', type: 'next_level', strength: 0.9 },
  { source: 'Chemistry', target: 'Environmental Science', type: 'related', strength: 0.7 }
].each do |rel|
  SubjectRelationship.find_or_create_by(
    source_subject: rel[:source],
    target_subject: rel[:target]
  ) do |sr|
    sr.relationship_type = rel[:type]
    sr.strength = rel[:strength]
  end
end

# Mathematics relationships
[
  { source: 'Algebra', target: 'Geometry', type: 'next_level', strength: 0.85 },
  { source: 'Algebra', target: 'Pre-Calculus', type: 'next_level', strength: 0.9 },
  { source: 'Algebra', target: 'Statistics', type: 'related', strength: 0.75 },
  { source: 'Algebra', target: 'Trigonometry', type: 'next_level', strength: 0.8 },
  { source: 'Geometry', target: 'Pre-Calculus', type: 'next_level', strength: 0.9 },
  { source: 'Geometry', target: 'Trigonometry', type: 'related', strength: 0.85 },
  { source: 'Pre-Calculus', target: 'Calculus', type: 'next_level', strength: 0.95 }
].each do |rel|
  SubjectRelationship.find_or_create_by(
    source_subject: rel[:source],
    target_subject: rel[:target]
  ) do |sr|
    sr.relationship_type = rel[:type]
    sr.strength = rel[:strength]
  end
end

# ESL relationships
[
  { source: 'ESL', target: 'Advanced English', type: 'next_level', strength: 0.9 },
  { source: 'ESL', target: 'Business English', type: 'related', strength: 0.8 },
  { source: 'ESL', target: 'TOEFL Prep', type: 'related', strength: 0.85 },
  { source: 'ESL', target: 'IELTS Prep', type: 'related', strength: 0.85 },
  { source: 'ESL', target: 'Academic Writing', type: 'related', strength: 0.8 }
].each do |rel|
  SubjectRelationship.find_or_create_by(
    source_subject: rel[:source],
    target_subject: rel[:target]
  ) do |sr|
    sr.relationship_type = rel[:type]
    sr.strength = rel[:strength]
  end
end

# SAT Math specific relationships
[
  { source: 'SAT Math', target: 'College Essays', type: 'related', strength: 0.7 },
  { source: 'SAT Math', target: 'AP Calculus', type: 'next_level', strength: 0.85 },
  { source: 'SAT Math', target: 'Statistics', type: 'related', strength: 0.75 }
].each do |rel|
  SubjectRelationship.find_or_create_by(
    source_subject: rel[:source],
    target_subject: rel[:target]
  ) do |sr|
    sr.relationship_type = rel[:type]
    sr.strength = rel[:strength]
  end
end

# Additional subject relationships
[
  { source: 'Physics', target: 'Advanced Physics', type: 'next_level', strength: 0.9 },
  { source: 'Physics', target: 'Engineering', type: 'related', strength: 0.8 },
  { source: 'Biology', target: 'Advanced Biology', type: 'next_level', strength: 0.9 },
  { source: 'Biology', target: 'Chemistry', type: 'related', strength: 0.75 },
  { source: 'Calculus', target: 'Advanced Calculus', type: 'next_level', strength: 0.95 },
  { source: 'Calculus', target: 'Physics', type: 'related', strength: 0.85 },
  { source: 'Statistics', target: 'Data Science', type: 'next_level', strength: 0.85 },
  { source: 'Statistics', target: 'AP Statistics', type: 'next_level', strength: 0.9 },
  { source: 'College Essays', target: 'Creative Writing', type: 'related', strength: 0.75 },
  { source: 'College Essays', target: 'AP English', type: 'related', strength: 0.8 },
  { source: 'Study Skills', target: 'Time Management', type: 'related', strength: 0.8 },
  { source: 'Study Skills', target: 'Test Taking Strategies', type: 'related', strength: 0.85 },
  { source: 'AP Prep', target: 'AP Calculus', type: 'related', strength: 0.8 },
  { source: 'AP Prep', target: 'AP Chemistry', type: 'related', strength: 0.8 },
  { source: 'AP Prep', target: 'AP Biology', type: 'related', strength: 0.8 },
  { source: 'TOEFL Prep', target: 'IELTS Prep', type: 'related', strength: 0.7 },
  { source: 'TOEFL Prep', target: 'Academic Writing', type: 'related', strength: 0.85 },
  { source: 'IELTS Prep', target: 'Academic Writing', type: 'related', strength: 0.85 },
  { source: 'Business English', target: 'Professional Communication', type: 'next_level', strength: 0.85 },
  { source: 'Academic Writing', target: 'Research Writing', type: 'next_level', strength: 0.9 }
].each do |rel|
  SubjectRelationship.find_or_create_by(
    source_subject: rel[:source],
    target_subject: rel[:target]
  ) do |sr|
    sr.relationship_type = rel[:type]
    sr.strength = rel[:strength]
  end
end

puts "Created #{SubjectRelationship.count} subject relationships"

puts "\nSeed data created successfully!"
puts "\nTo use the API, include this header:"
puts "Authorization: Bearer #{student.authentication_token}"
puts "\nOr use student_id parameter: student_id=#{student.id}"

