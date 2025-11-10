module Api
  module V1
    module Retention
      class NudgeAnalyticsController < BaseController
        def show
          student = current_student
          nudges = student.early_engagement_nudges

          # Calculate metrics
          total_sent = nudges.where.not(sent_at: nil).count
          total_opened = nudges.where.not(opened_at: nil).count
          total_clicked = nudges.where.not(clicked_at: nil).count
          total_converted = nudges.where(session_booked: true).count

          open_rate = total_sent > 0 ? (total_opened.to_f / total_sent * 100).round(2) : 0
          click_rate = total_sent > 0 ? (total_clicked.to_f / total_sent * 100).round(2) : 0
          conversion_rate = total_sent > 0 ? (total_converted.to_f / total_sent * 100).round(2) : 0

          # Breakdown by nudge type
          day_7_nudges = nudges.where(nudge_type: 'day_7_reminder')
          day_10_nudges = nudges.where(nudge_type: 'day_10_followup')

          day_7_metrics = calculate_metrics(day_7_nudges)
          day_10_metrics = calculate_metrics(day_10_nudges)

          render json: {
            overall: {
              total_sent: total_sent,
              total_opened: total_opened,
              total_clicked: total_clicked,
              total_converted: total_converted,
              open_rate: open_rate,
              click_rate: click_rate,
              conversion_rate: conversion_rate
            },
            by_type: {
              day_7_reminder: day_7_metrics,
              day_10_followup: day_10_metrics
            },
            recent_nudges: nudges.order(sent_at: :desc).limit(10).map { |n| nudge_json(n) }
          }
        end

        private

        def calculate_metrics(nudges)
          total_sent = nudges.where.not(sent_at: nil).count
          total_opened = nudges.where.not(opened_at: nil).count
          total_clicked = nudges.where.not(clicked_at: nil).count
          total_converted = nudges.where(session_booked: true).count

          {
            total_sent: total_sent,
            total_opened: total_opened,
            total_clicked: total_clicked,
            total_converted: total_converted,
            open_rate: total_sent > 0 ? (total_opened.to_f / total_sent * 100).round(2) : 0,
            click_rate: total_sent > 0 ? (total_clicked.to_f / total_sent * 100).round(2) : 0,
            conversion_rate: total_sent > 0 ? (total_converted.to_f / total_sent * 100).round(2) : 0
          }
        end

        def nudge_json(nudge)
          {
            id: nudge.id,
            nudge_type: nudge.nudge_type,
            message: nudge.message,
            delivery_channel: nudge.delivery_channel,
            sent_at: nudge.sent_at,
            opened_at: nudge.opened_at,
            clicked_at: nudge.clicked_at,
            session_booked: nudge.session_booked,
            session_id: nudge.session_id
          }
        end
      end
    end
  end
end


