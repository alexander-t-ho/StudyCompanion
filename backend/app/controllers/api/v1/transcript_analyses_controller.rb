module Api
  module V1
    class TranscriptAnalysesController < ApplicationController
      before_action :set_analysis, only: [:show, :update, :validate]

      def show
        render json: @analysis, include: :transcript
      end

      def update
        @analysis.update!(analysis_params)
        render json: @analysis
      end

      def validate
        @analysis.update!(
          validation_rating: params[:validation_rating],
          validation_notes: params[:validation_notes],
          validated: params[:validated] == 'true'
        )

        render json: @analysis
      end

      private

      def set_analysis
        @analysis = TranscriptAnalysis.find(params[:id])
      end

      def analysis_params
        params.require(:transcript_analysis).permit(
          :engagement_score,
          :summary
        )
      end
    end
  end
end

