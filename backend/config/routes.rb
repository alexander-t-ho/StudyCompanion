Rails.application.routes.draw do
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

      # Retention endpoints (Platform Integration - stubs for Retention Enhancement)
      namespace :retention do
        get '/goal-suggestions/:goal_id', to: 'goal_suggestions#index'
        post '/goal-suggestions/:id/accept', to: 'goal_suggestions#accept'
        
        get '/nudges/eligibility', to: 'nudges#eligibility'
        post '/nudges/send', to: 'nudges#send'
        
        get '/progress-dashboard', to: 'progress_dashboard#show'
        get '/progress-dashboard/insights', to: 'progress_dashboard#insights'
      end
    end
  end
end

