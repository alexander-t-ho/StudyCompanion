namespace :progress_snapshots do
  desc "Create progress snapshots for all students' active goals"
  task create: :environment do
    puts "Creating progress snapshots at #{Time.current}"
    
    begin
      DailyProgressSnapshotJob.perform_now
      puts "Progress snapshots created successfully"
    rescue => e
      puts "Error creating snapshots: #{e.message}"
      puts e.backtrace.join("\n")
      raise
    end
  end

  desc "Create snapshots for a specific student"
  task :create_for_student, [:student_id] => :environment do |t, args|
    student_id = args[:student_id]
    unless student_id
      puts "Usage: rails progress_snapshots:create_for_student[student_id]"
      exit
    end

    student = Student.find(student_id)
    puts "Creating snapshots for student #{student_id} (#{student.email})"
    
    GoalProgressSnapshotService.create_snapshots_for_student(student)
    puts "Snapshots created for student #{student_id}"
  end
end


