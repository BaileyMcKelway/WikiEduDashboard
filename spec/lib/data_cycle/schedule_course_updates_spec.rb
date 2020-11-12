# frozen_string_literal: true

require 'rails_helper'
require "#{Rails.root}/lib/data_cycle/schedule_course_updates"

describe ScheduleCourseUpdates do
  let(:fast_update_logs) do
    {
      'update_logs' => { 1 => { 'start_time' => 2.seconds.ago, 'end_time' => 1.second.ago } }
    }
  end

  let(:medium_update_logs) do
    {
      'update_logs' => { 1 => { 'start_time' => 2.minutes.ago, 'end_time' => 1.second.ago } }
    }
  end

  let(:slow_update_logs) do
    {
      'update_logs' => { 1 => { 'start_time' => 2.hours.ago, 'end_time' => 1.second.ago } }
    }
  end

  describe 'on initialization' do
    before do
      create(:editathon, start: 1.day.ago, end: 2.hours.from_now,
                         slug: 'ArtFeminism/Test_Editathon')
      create(:course, start: 1.day.ago, end: 2.months.from_now,
                      slug: 'Medium/Course', needs_update: true)
      create(:course, start: 1.day.ago, end: 1.year.from_now,
                      slug: 'Long/Program')
      create(:course, slug: 'Fast/Updates', flags: fast_update_logs)
      create(:course, slug: 'Medium/Updates', flags: medium_update_logs)
      create(:course, slug: 'Slow/Updates', flags: slow_update_logs)
    end

    it 'calls the revisions and articles updates on courses currently taking place' do
      expect(UpdateCourseStats).to receive(:new).exactly(6).times
      expect(Raven).to receive(:capture_message).and_call_original
      update = described_class.new
      sentry_logs = update.instance_variable_get(:@sentry_logs)
      expect(sentry_logs.grep(/Short update latency/).any?).to eq(true)
    end

    it 'clears the needs_update flag from courses' do
      expect(Course.where(needs_update: true).any?).to be(true)
      described_class.new
      expect(Course.where(needs_update: true).any?).to be(false)
    end

    it 'reports logs to sentry even when it errors out' do
      allow(Raven).to receive(:capture_message)
      expect(CourseDataUpdateWorker).to receive(:update_course)
        .and_raise(StandardError)
      expect { described_class.new }.to raise_error(StandardError)
      expect(Raven).to have_received(:capture_message)
    end
  end

  describe 'on calling update workers' do
    let(:queue) { 'medium_update' }
    let(:short_queue) { 'short_update' }
    let(:flags) { nil }

    context 'a course has no job enqueued' do
      before do
        Sidekiq::Testing.disable!
        create(:course, start: 1.day.ago, end: 2.months.from_now,
                        slug: 'Medium/Course', needs_update: true, flags: flags)
      end

      after do
        # Clearing the queue after the test
        Sidekiq::Queue.new(queue).clear
        Sidekiq::Queue.new(short_queue).clear
        Sidekiq::Testing.inline!
      end

      it 'adds the right kind of job, when no orphan lock' do
        # No job before
        expect(Sidekiq::Queue.new(queue).size).to eq 0
        described_class.new

        # 1 job enqueued by ScheduleCourseUpdates
        expect(Sidekiq::Queue.new(queue).size).to eq 1
        job = Sidekiq::Queue.new(queue).first
        expect(job.klass).to eq 'CourseDataUpdateWorker'
        expect(job.args).to eq [Course.first.id]
      end

      it 'logs previous update failure and adds job, when orphan lock' do
        # Adding orphan lock
        SidekiqUniqueJobs::Locksmith
          .new({ 'jid' => 1234,
                 'unique_digest' => CheckCourseJobs.new(Course.first).expected_digest })
          .lock

        # No job before
        expect(Sidekiq::Queue.new(queue).size).to eq 0
        expect(Sidekiq::Queue.new(short_queue).size).to eq 0
        described_class.new

        # 1 job enqueued by ScheduleCourseUpdates
        # It goes in the 'short' queue, because once it has an update log, queue
        # sorting happens based on average time of recent updates, which
        # is considered 0 for a failed update.
        expect(Sidekiq::Queue.new(short_queue).size).to eq 1
        # Orphan lock  failure is logged
        expect(Course.first.flags['update_logs'][1]['orphan_lock_failure'].present?).to eq true
      end
    end
  end
end
