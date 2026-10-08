import { mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { describe, expect, it } from 'vitest'
import AiModerationPanel from '../AiModerationPanel.vue'
import type { AiReview } from '@/lib/aiModeration'

const review: AiReview = {
  event_id: 'event-1',
  status: 'completed',
  error_message: null,
  updated_at: '2030-01-01T00:00:00Z',
  result: {
    riskLevel: 'medium',
    completenessScore: 60,
    flags: [
      { code: 'low_quality', severity: 'medium', reason: 'Description contains test content.' },
    ],
    missingFields: ['Agenda'],
    duplicates: [
      {
        eventId: 'event-2',
        title: 'Original workshop',
        similarity: 95,
        reason: 'Same dated session.',
      },
    ],
    recommendation: 'request_changes',
    reason: 'Please add an agenda.',
    suggestedDescription: 'A campus workshop for students.',
  },
}
const render = (overrides = {}) =>
  mount(AiModerationPanel, {
    props: { review, busy: false, adopting: false, pending: true, ...overrides },
    global: { plugins: [ElementPlus] },
  })

describe('AI moderation detail panel', () => {
  it('shows score, risk evidence, missing information and duplicate context', () => {
    const wrapper = render()
    expect(wrapper.text()).toContain('MEDIUM RISK')
    expect(wrapper.text()).toContain('Completeness 60/100')
    expect(wrapper.text()).toContain('Description contains test content.')
    expect(wrapper.text()).toContain('Agenda')
    expect(wrapper.text()).toContain('95% similar')
    expect(wrapper.text()).toContain('Same dated session.')
  })
  it('emits the administrator-selected adoption action and duplicate navigation', async () => {
    const wrapper = render()
    const button = (text: string) =>
      wrapper.findAll('button').find((button) => button.text() === text)!
    await button('Apply AI description').trigger('click')
    await button('Return with AI reason').trigger('click')
    await button('Original workshop').trigger('click')
    expect(wrapper.emitted('adopt')).toEqual([['description'], ['reject']])
    expect(wrapper.emitted('openDuplicate')).toEqual([['event-2']])
  })
  it('hides actions after a submission leaves the pending queue', () => {
    const wrapper = render({ pending: false })
    expect(wrapper.text()).not.toContain('Apply AI description')
    expect(wrapper.text()).not.toContain('Return with AI reason')
    expect(wrapper.text()).not.toContain('Analyze again')
  })
  it('shows processing and deployment/provider failures without suggesting a pass', () => {
    expect(render({ busy: true }).text()).toContain('Analyzing safety')
    expect(render({ busy: true }).text()).not.toContain('Completeness 60/100')
    const wrapper = render({
      review: {
        ...review,
        status: 'failed',
        result: null,
        error_message: 'Provider is unavailable',
      },
    })
    expect(wrapper.text()).toContain('Provider is unavailable')
    expect(wrapper.text()).toContain('Run AI review')
  })
})
