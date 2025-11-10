Rails.application.routes.draw do
  # Active Storage routes
  mount ActiveStorage::Engine => '/rails/active_storage'
  
  namespace :api do
    namespace :v1 do
      # Transcript endpoints (Phase 1 & 2)
      resources :transcripts, only: [:index, :show, :create] do
        member do
          post :validate
          post :analyze
        end
        collection do
          post :generate_random_fields
          post :generate_random_topic
        end
      end
      resources :transcript_analyses, only: [:show, :update] do
        member do
          post :validate
        end
      end
      
      # Session summary endpoints
      post '/session-summaries/create-from-transcript', to: 'session_summaries#create_from_transcript'

      # AI Companion endpoints (Platform Integration - stubs for Core AI Companion)
      namespace :ai_companion do
        post '/chat', to: 'chat#create'
        get '/conversation-history', to: 'chat#history'
        
        post '/practice/generate', to: 'practice#generate'
        get '/practice/available-subjects', to: 'practice#available_subjects'
        get '/practice/list', to: 'practice#index'
        get '/practice/:id', to: 'practice#show'
        post '/practice/:id/submit', to: 'practice#submit'
        
        get '/profile', to: 'profile#show'
        patch '/profile', to: 'profile#update'
        
        get '/session-summaries', to: 'session_summaries#index'
        get '/session-summaries/:id', to: 'session_summaries#show'
        
        post '/routing/check', to: 'routing#check'
        post '/routing/request', to: 'routing#request'
      end

      # Goals endpoints
      resources :goals, only: [:index, :show, :create, :update, :destroy] do
        member do
          post :recalculate_progress
        end
        collection do
          get :suggestions
        end
      end

      # Sessions endpoints
      resources :sessions, only: [:index, :show, :create, :update, :destroy]

      # Authentication endpoints
      post '/auth/login', to: 'auth#login'
      post '/auth/logout', to: 'auth#logout'

      # Profile endpoints
      get '/profile', to: 'profile#show'
      patch '/profile', to: 'profile#update'
      patch '/profile/change_password', to: 'profile#change_password'

      # Study notes endpoint (for students to create notes from AI chat)
      post '/study_notes', to: 'study_notes#create'

      # Admin endpoints
      namespace :admin do
        resources :students, only: [:index, :show]
        resources :study_notes, only: [:index, :update]
      end

      # Student Dashboard endpoints
      get '/student/dashboard', to: 'student_dashboard#index'
      get '/student/dashboard/long-term-goals', to: 'student_dashboard#long_term_goals'
      get '/student/dashboard/all-sessions', to: 'student_dashboard#all_sessions'
      get '/student/dashboard/subjects/:subject', to: 'student_dashboard#show', as: 'student_dashboard_subject'

      # Understanding Level endpoints
      resources :students, only: [] do
        get '/understanding-levels', to: 'understanding_levels#index'
        get '/understanding-levels/summary', to: 'understanding_levels#summary'
        get '/understanding-levels/all-subjects', to: 'understanding_levels#all_subjects'
        get '/understanding-levels/:subject/progression', to: 'understanding_levels#progression'
      end

      # Retention endpoints (Platform Integration - stubs for Retention Enhancement)
      namespace :retention do
        get '/goal-suggestions/:goal_id', to: 'goal_suggestions#index'
        post '/goal-suggestions/:id/accept', to: 'goal_suggestions#accept'
        
        get '/nudges', to: 'nudges#index'
        get '/nudges/eligibility', to: 'nudges#eligibility'
        post '/nudges/send', to: 'nudges#create'
        post '/nudges/:id/mark-opened', to: 'nudges#mark_opened'
        post '/nudges/:id/mark-clicked', to: 'nudges#mark_clicked'
        
        get '/progress-dashboard', to: 'progress_dashboard#show'
        get '/progress-dashboard/insights', to: 'progress_dashboard#insights'
        get '/progress-history', to: 'progress_history#show'
        get '/progress-history/:goal_id', to: 'progress_history#show'
        
        get '/nudge-analytics', to: 'nudge_analytics#show'
      end

      # Analytics endpoints (Analytics & Measurement PRD)
      namespace :analytics do
        get '/dashboard', to: 'dashboard#show'
        
        get '/metrics/summary', to: 'metrics#summary'
        get '/metrics/:metric_name', to: 'metrics#show'
        post '/metrics/calculate', to: 'metrics#calculate'
        
        get '/events', to: 'events#index'
        post '/events', to: 'events#create'
        
        get '/costs/summary', to: 'costs#summary'
        get '/costs/trends', to: 'costs#trends'
        get '/costs/projections', to: 'costs#projections'
        
        # A/B Testing
        post '/ab_testing/assign', to: 'ab_testing#assign'
        get '/ab_testing/variation', to: 'ab_testing#variation'
        get '/ab_testing/results', to: 'ab_testing#results'
      end
    end
  end
end

