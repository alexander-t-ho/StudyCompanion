# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.1].define(version: 2025_11_10_051518) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "ab_test_variations", force: :cascade do |t|
    t.bigint "student_id", null: false
    t.string "test_name", null: false
    t.string "variation_name", null: false
    t.boolean "is_active", default: true
    t.datetime "assigned_at", null: false
    t.datetime "ended_at"
    t.jsonb "metadata", default: {}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["student_id", "test_name", "is_active"], name: "idx_on_student_id_test_name_is_active_79568ef86a"
    t.index ["student_id"], name: "index_ab_test_variations_on_student_id"
    t.index ["test_name", "variation_name"], name: "index_ab_test_variations_on_test_name_and_variation_name"
    t.index ["test_name"], name: "index_ab_test_variations_on_test_name"
  end

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "ai_companion_profiles", force: :cascade do |t|
    t.bigint "student_id", null: false
    t.jsonb "conversation_history", default: []
    t.jsonb "learning_preferences", default: {}
    t.datetime "last_interaction_at"
    t.integer "total_interactions_count", default: 0
    t.boolean "enabled", default: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["last_interaction_at"], name: "index_ai_companion_profiles_on_last_interaction_at"
    t.index ["student_id"], name: "index_ai_companion_profiles_on_student_id", unique: true
  end

  create_table "ai_cost_tracking", force: :cascade do |t|
    t.bigint "student_id"
    t.string "cost_type", null: false
    t.string "model_used"
    t.integer "token_count", default: 0
    t.decimal "cost", precision: 10, scale: 6, null: false
    t.string "provider"
    t.jsonb "metadata", default: {}
    t.date "cost_date", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["cost_date"], name: "index_ai_cost_tracking_on_cost_date"
    t.index ["cost_type", "cost_date"], name: "index_ai_cost_tracking_on_cost_type_and_cost_date"
    t.index ["cost_type"], name: "index_ai_cost_tracking_on_cost_type"
    t.index ["student_id", "cost_date"], name: "index_ai_cost_tracking_on_student_id_and_cost_date"
    t.index ["student_id"], name: "index_ai_cost_tracking_on_student_id"
  end

  create_table "analytics_events", force: :cascade do |t|
    t.bigint "student_id"
    t.string "event_type", null: false
    t.string "event_category", null: false
    t.jsonb "properties", default: {}
    t.string "session_id"
    t.string "user_agent"
    t.string "ip_address"
    t.datetime "occurred_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["event_category"], name: "index_analytics_events_on_event_category"
    t.index ["event_type", "occurred_at"], name: "index_analytics_events_on_event_type_and_occurred_at"
    t.index ["event_type"], name: "index_analytics_events_on_event_type"
    t.index ["occurred_at"], name: "index_analytics_events_on_occurred_at"
    t.index ["student_id", "event_type", "occurred_at"], name: "idx_on_student_id_event_type_occurred_at_2353876bbb"
    t.index ["student_id"], name: "index_analytics_events_on_student_id"
  end

  create_table "analytics_metrics", force: :cascade do |t|
    t.bigint "student_id"
    t.string "metric_name", null: false
    t.string "metric_category", null: false
    t.decimal "metric_value", precision: 15, scale: 4, null: false
    t.string "metric_unit"
    t.date "metric_date", null: false
    t.jsonb "dimensions", default: {}
    t.string "aggregation_period", default: "daily"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["metric_category"], name: "index_analytics_metrics_on_metric_category"
    t.index ["metric_date"], name: "index_analytics_metrics_on_metric_date"
    t.index ["metric_name", "metric_date", "aggregation_period"], name: "idx_on_metric_name_metric_date_aggregation_period_dd066f9b30"
    t.index ["metric_name"], name: "index_analytics_metrics_on_metric_name"
    t.index ["student_id", "metric_name", "metric_date"], name: "idx_on_student_id_metric_name_metric_date_a13e0a2df3"
    t.index ["student_id"], name: "index_analytics_metrics_on_student_id"
  end

  create_table "conversation_messages", force: :cascade do |t|
    t.bigint "student_id", null: false
    t.bigint "ai_companion_profile_id"
    t.string "role", null: false
    t.text "content", null: false
    t.jsonb "context", default: {}
    t.bigint "session_id"
    t.bigint "session_summary_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["ai_companion_profile_id"], name: "index_conversation_messages_on_ai_companion_profile_id"
    t.index ["role"], name: "index_conversation_messages_on_role"
    t.index ["session_id"], name: "index_conversation_messages_on_session_id"
    t.index ["session_summary_id"], name: "index_conversation_messages_on_session_summary_id"
    t.index ["student_id", "created_at"], name: "index_conversation_messages_on_student_id_and_created_at"
  end

  create_table "early_engagement_nudges", force: :cascade do |t|
    t.bigint "student_id", null: false
    t.string "nudge_type"
    t.text "message", null: false
    t.string "delivery_channel"
    t.datetime "sent_at"
    t.datetime "opened_at"
    t.datetime "clicked_at"
    t.boolean "session_booked", default: false
    t.bigint "session_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "variant"
    t.index ["session_booked"], name: "index_early_engagement_nudges_on_session_booked"
    t.index ["session_id"], name: "index_early_engagement_nudges_on_session_id"
    t.index ["student_id", "sent_at"], name: "index_early_engagement_nudges_on_student_id_and_sent_at"
    t.index ["variant"], name: "index_early_engagement_nudges_on_variant"
  end

  create_table "goal_progress_snapshots", force: :cascade do |t|
    t.bigint "student_id", null: false
    t.bigint "goal_id", null: false
    t.decimal "completion_percentage", precision: 5, scale: 2
    t.integer "milestones_completed", default: 0
    t.date "estimated_completion_date"
    t.date "snapshot_date", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["goal_id", "snapshot_date"], name: "index_goal_progress_snapshots_on_goal_id_and_snapshot_date"
    t.index ["snapshot_date"], name: "index_goal_progress_snapshots_on_snapshot_date"
    t.index ["student_id", "snapshot_date"], name: "index_goal_progress_snapshots_on_student_id_and_snapshot_date"
  end

  create_table "goal_suggestions", force: :cascade do |t|
    t.bigint "student_id", null: false
    t.bigint "source_goal_id", null: false
    t.string "suggested_subject", null: false
    t.string "suggested_goal_type"
    t.text "reasoning"
    t.decimal "confidence", precision: 3, scale: 2
    t.datetime "presented_at"
    t.datetime "accepted_at"
    t.bigint "created_goal_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_goal_id"], name: "index_goal_suggestions_on_created_goal_id"
    t.index ["source_goal_id"], name: "index_goal_suggestions_on_source_goal_id"
    t.index ["student_id", "presented_at"], name: "index_goal_suggestions_on_student_id_and_presented_at"
  end

  create_table "goals", force: :cascade do |t|
    t.bigint "student_id", null: false
    t.string "subject", null: false
    t.string "goal_type"
    t.string "title"
    t.text "description"
    t.string "status", default: "active"
    t.date "target_date"
    t.date "completed_at"
    t.integer "progress_percentage", default: 0
    t.jsonb "metadata", default: {}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "parent_goal_id"
    t.index ["parent_goal_id"], name: "index_goals_on_parent_goal_id"
    t.index ["status"], name: "index_goals_on_status"
    t.index ["student_id", "status"], name: "index_goals_on_student_id_and_status"
    t.index ["student_id", "subject", "status"], name: "index_goals_on_student_id_subject_status"
    t.index ["student_id", "subject"], name: "index_goals_on_student_id_and_subject"
    t.index ["student_id"], name: "index_goals_on_student_id"
  end

  create_table "practice_problems", force: :cascade do |t|
    t.bigint "student_id", null: false
    t.bigint "goal_id"
    t.string "subject"
    t.string "topic"
    t.integer "difficulty_level"
    t.jsonb "problem_content", null: false
    t.jsonb "correct_answer"
    t.jsonb "solution_steps"
    t.datetime "assigned_at", default: -> { "CURRENT_TIMESTAMP" }
    t.datetime "completed_at"
    t.jsonb "student_answer"
    t.boolean "is_correct"
    t.text "feedback"
    t.integer "attempts_count", default: 0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["goal_id"], name: "index_practice_problems_on_goal_id"
    t.index ["student_id", "assigned_at"], name: "index_practice_problems_on_student_id_and_assigned_at"
    t.index ["student_id", "completed_at"], name: "index_practice_problems_on_student_id_and_completed_at"
  end

  create_table "session_summaries", force: :cascade do |t|
    t.bigint "session_id", null: false
    t.bigint "student_id", null: false
    t.bigint "transcript_id"
    t.bigint "transcript_analysis_id"
    t.text "extracted_topics", default: [], array: true
    t.text "key_concepts", default: [], array: true
    t.text "learning_points"
    t.text "strengths_identified", default: [], array: true
    t.text "areas_for_improvement", default: [], array: true
    t.string "processing_status", default: "pending"
    t.text "error_message"
    t.datetime "processed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.decimal "understanding_level", precision: 5, scale: 2
    t.decimal "previous_understanding_level", precision: 5, scale: 2
    t.index ["processing_status"], name: "index_session_summaries_on_processing_status"
    t.index ["session_id"], name: "index_session_summaries_on_session_id", unique: true
    t.index ["student_id", "understanding_level"], name: "index_session_summaries_on_student_id_and_understanding_level"
    t.index ["student_id"], name: "index_session_summaries_on_student_id"
    t.index ["transcript_analysis_id"], name: "index_session_summaries_on_transcript_analysis_id"
    t.index ["transcript_id"], name: "index_session_summaries_on_transcript_id"
    t.index ["understanding_level"], name: "index_session_summaries_on_understanding_level"
  end

  create_table "sessions", force: :cascade do |t|
    t.bigint "student_id", null: false
    t.integer "tutor_id"
    t.string "subject"
    t.string "topic"
    t.datetime "scheduled_at"
    t.datetime "started_at"
    t.datetime "ended_at"
    t.integer "duration_minutes"
    t.string "status", default: "scheduled"
    t.text "notes"
    t.string "recording_url"
    t.jsonb "metadata", default: {}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["scheduled_at"], name: "index_sessions_on_scheduled_at"
    t.index ["status"], name: "index_sessions_on_status"
    t.index ["student_id"], name: "index_sessions_on_student_id"
  end

  create_table "students", force: :cascade do |t|
    t.string "email", null: false
    t.string "name"
    t.string "authentication_token"
    t.boolean "ai_companion_enabled", default: false
    t.jsonb "metadata", default: {}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "password_digest"
    t.string "username"
    t.boolean "is_admin", default: false, null: false
    t.index ["ai_companion_enabled"], name: "index_students_on_ai_companion_enabled"
    t.index ["authentication_token"], name: "index_students_on_authentication_token"
    t.index ["email"], name: "index_students_on_email", unique: true
    t.index ["username"], name: "index_students_on_username", unique: true
  end

  create_table "study_notes", force: :cascade do |t|
    t.bigint "student_id", null: false
    t.string "subject"
    t.string "concept"
    t.text "message"
    t.datetime "detected_at"
    t.boolean "notified_tutor", default: false, null: false
    t.bigint "conversation_message_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["conversation_message_id"], name: "index_study_notes_on_conversation_message_id"
    t.index ["student_id"], name: "index_study_notes_on_student_id"
  end

  create_table "subject_relationships", force: :cascade do |t|
    t.string "source_subject", null: false
    t.string "target_subject", null: false
    t.string "relationship_type"
    t.decimal "strength", precision: 3, scale: 2, default: "1.0"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["source_subject", "target_subject"], name: "idx_on_source_subject_target_subject_45ec5165e6", unique: true
    t.index ["source_subject"], name: "index_subject_relationships_on_source_subject"
    t.index ["target_subject"], name: "index_subject_relationships_on_target_subject"
  end

  create_table "transcript_analyses", force: :cascade do |t|
    t.bigint "transcript_id", null: false
    t.jsonb "sentiment_analysis"
    t.jsonb "concept_extraction"
    t.jsonb "speaker_identification"
    t.integer "engagement_score"
    t.jsonb "engagement_metrics"
    t.text "summary"
    t.string "model_used"
    t.integer "token_count"
    t.decimal "analysis_cost", precision: 10, scale: 4
    t.boolean "validated", default: false
    t.integer "validation_rating"
    t.text "validation_notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["transcript_id"], name: "index_transcript_analyses_on_transcript_id", unique: true
    t.index ["validated"], name: "index_transcript_analyses_on_validated"
  end

  create_table "transcripts", force: :cascade do |t|
    t.bigint "session_id"
    t.bigint "student_id"
    t.string "subject"
    t.string "topic"
    t.string "student_level"
    t.integer "session_duration_minutes"
    t.text "learning_objectives"
    t.text "student_personality"
    t.text "transcript_content"
    t.jsonb "generation_parameters"
    t.integer "quality_rating"
    t.text "validation_notes"
    t.boolean "approved", default: false
    t.string "model_used"
    t.integer "token_count"
    t.decimal "generation_cost", precision: 10, scale: 4
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.date "session_date"
    t.integer "session_count_this_week"
    t.decimal "understanding_level", precision: 5, scale: 2
    t.decimal "previous_understanding_level", precision: 5, scale: 2
    t.jsonb "goals_snapshot", default: {}
    t.jsonb "session_history_summary", default: {}
    t.index ["approved"], name: "index_transcripts_on_approved"
    t.index ["created_at"], name: "index_transcripts_on_created_at"
    t.index ["session_date"], name: "index_transcripts_on_session_date"
    t.index ["session_id"], name: "index_transcripts_on_session_id"
    t.index ["student_id", "subject", "session_date"], name: "index_transcripts_on_student_id_subject_session_date"
    t.index ["student_id", "subject", "understanding_level"], name: "idx_on_student_id_subject_understanding_level_492db45d5c"
    t.index ["student_id", "subject", "understanding_level"], name: "index_transcripts_on_student_id_subject_understanding_level", where: "(understanding_level IS NOT NULL)"
    t.index ["student_id", "subject"], name: "index_transcripts_on_student_id_and_subject"
    t.index ["student_id"], name: "index_transcripts_on_student_id"
    t.index ["subject"], name: "index_transcripts_on_subject"
    t.index ["understanding_level"], name: "index_transcripts_on_understanding_level"
  end

  create_table "tutor_routing_events", force: :cascade do |t|
    t.bigint "student_id", null: false
    t.bigint "conversation_message_id"
    t.text "routing_reason"
    t.decimal "routing_confidence", precision: 3, scale: 2
    t.string "urgency"
    t.boolean "session_booked", default: false
    t.bigint "session_id"
    t.boolean "tutor_notified", default: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["conversation_message_id"], name: "index_tutor_routing_events_on_conversation_message_id"
    t.index ["session_booked"], name: "index_tutor_routing_events_on_session_booked"
    t.index ["session_id"], name: "index_tutor_routing_events_on_session_id"
    t.index ["student_id", "created_at"], name: "index_tutor_routing_events_on_student_id_and_created_at"
  end

  add_foreign_key "ab_test_variations", "students"
  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "ai_companion_profiles", "students"
  add_foreign_key "ai_cost_tracking", "students"
  add_foreign_key "analytics_events", "students"
  add_foreign_key "analytics_metrics", "students"
  add_foreign_key "conversation_messages", "ai_companion_profiles"
  add_foreign_key "conversation_messages", "session_summaries"
  add_foreign_key "conversation_messages", "sessions"
  add_foreign_key "conversation_messages", "students"
  add_foreign_key "early_engagement_nudges", "sessions"
  add_foreign_key "early_engagement_nudges", "students"
  add_foreign_key "goal_progress_snapshots", "goals"
  add_foreign_key "goal_progress_snapshots", "students"
  add_foreign_key "goal_suggestions", "goals", column: "created_goal_id"
  add_foreign_key "goal_suggestions", "goals", column: "source_goal_id"
  add_foreign_key "goal_suggestions", "students"
  add_foreign_key "goals", "goals", column: "parent_goal_id"
  add_foreign_key "goals", "students"
  add_foreign_key "practice_problems", "goals"
  add_foreign_key "practice_problems", "students"
  add_foreign_key "session_summaries", "sessions"
  add_foreign_key "session_summaries", "students"
  add_foreign_key "session_summaries", "transcript_analyses"
  add_foreign_key "session_summaries", "transcripts"
  add_foreign_key "sessions", "students"
  add_foreign_key "study_notes", "conversation_messages"
  add_foreign_key "study_notes", "students"
  add_foreign_key "transcript_analyses", "transcripts"
  add_foreign_key "tutor_routing_events", "conversation_messages"
  add_foreign_key "tutor_routing_events", "sessions"
  add_foreign_key "tutor_routing_events", "students"
end
