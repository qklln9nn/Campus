import { describe, expect, it, vi } from 'vitest'
import { analyzeEvent } from '../../../supabase/functions/ai-moderation/analyze'
import {
  buildModerationResult,
  parseContentAssessment,
  parseDuplicates,
  type EventContent,
} from '../../../supabase/functions/_shared/moderation'

const event: EventContent = {
  id: 'target',
  organiser_id: 'organiser-1',
  title: 'Campus coding workshop',
  description: 'A hands-on Vue workshop for beginners. Bring your laptop for exercises and a Q&A.',
  category: 'tech',
  event_date: '2030-01-01',
  start_time: '10:00:00',
  end_time: '12:00:00',
  location: 'Lab 1',
  online_link: null,
  capacity: 30,
  image_url: null,
}
const assessment = {
  flags: [],
  descriptionQuality: 40,
  missingFields: [],
  recommendation: 'approve',
  reason: 'Clear event details with no text safety concerns.',
  suggestedDescription: null,
}

describe('AI moderation assessment', () => {
  it('scores complete event information at 100 and does not require an optional poster', () => {
    expect(buildModerationResult(event, parseContentAssessment(assessment), [])).toMatchObject({
      completenessScore: 100,
      riskLevel: 'low',
      recommendation: 'approve',
      missingFields: [],
    })
  })
  it.each(['asdf', 'TEST 123', '', 'aaaaaaaaaaaaaaaaaaaaaaaaa'])(
    'flags filler content despite an optimistic provider score: %s',
    (description) => {
      const result = buildModerationResult(
        { ...event, description },
        parseContentAssessment(assessment),
        [],
      )
      expect(result.completenessScore).toBe(60)
      expect(result.recommendation).toBe('request_changes')
      expect(result.flags.some((flag) => flag.code === 'low_quality')).toBe(true)
    },
  )
  it('flags missing date, time, location and description', () => {
    const result = buildModerationResult(
      { ...event, event_date: '', start_time: '', end_time: '', location: '', description: '' },
      parseContentAssessment(assessment),
      [],
    )
    expect(result.completenessScore).toBe(20)
    expect(result.missingFields).toHaveLength(3)
  })
  it('flags vague descriptions from the quality score even if the provider omits a risk flag', () => {
    const result = buildModerationResult(
      event,
      parseContentAssessment({ ...assessment, descriptionQuality: 5 }),
      [],
    )
    expect(result.completenessScore).toBe(65)
    expect(result.riskLevel).toBe('medium')
    expect(result.recommendation).toBe('request_changes')
  })
  it.each(['illegal_content', 'external_scam', 'hate_speech'])(
    'requires human rejection review for high severity %s',
    (code) => {
      const result = buildModerationResult(
        event,
        parseContentAssessment({
          ...assessment,
          flags: [{ code, severity: 'high', reason: 'Evidence requiring administrator review.' }],
        }),
        [],
      )
      expect(result).toMatchObject({ riskLevel: 'high', recommendation: 'reject' })
      expect(result.reason).toContain('Evidence')
    },
  )
  it.each([
    null,
    {},
    { ...assessment, descriptionQuality: 100 },
    { ...assessment, flags: [{ code: 'made_up', severity: 'high', reason: 'x' }] },
    { ...assessment, reason: '' },
  ])('rejects malformed provider output', (value) => {
    expect(() => parseContentAssessment(value)).toThrow()
  })
  it('rejects fabricated duplicate IDs and out-of-range similarities', () => {
    const candidate = { ...event, id: 'candidate' }
    expect(() =>
      parseDuplicates(
        { duplicates: [{ eventId: 'not-in-database', similarity: 99, reason: 'Same meaning' }] },
        [candidate],
      ),
    ).toThrow()
    expect(() =>
      parseDuplicates(
        { duplicates: [{ eventId: 'candidate', similarity: 101, reason: 'Same meaning' }] },
        [candidate],
      ),
    ).toThrow()
  })
  it('compares all batches semantically and excludes other organisers and the target', async () => {
    const candidates = Array.from({ length: 23 }, (_, index) => ({
      ...event,
      id: `candidate-${index}`,
      title: `Paraphrased activity ${index}`,
    }))
    const callAi = vi.fn(async (_system: string, input: unknown) => {
      if (!('candidates' in (input as object))) return assessment
      const batch = (input as { candidates: EventContent[] }).candidates
      return {
        duplicates: [
          {
            eventId: batch[batch.length - 1]!.id,
            similarity: 95,
            reason: 'Same session, date and purpose expressed with different words.',
          },
        ],
      }
    })
    const result = await analyzeEvent(
      event,
      [...candidates, event, { ...event, id: 'unrelated', organiser_id: 'someone-else' }],
      callAi,
    )
    expect(callAi).toHaveBeenCalledTimes(4)
    expect(result.duplicates.map((match) => match.eventId)).toEqual([
      'candidate-9',
      'candidate-19',
      'candidate-22',
    ])
    expect(result.recommendation).toBe('request_changes')
    expect(result.flags.some((flag) => flag.code === 'duplicate')).toBe(true)
  })
  it('does not flag a legitimate recurring session below the duplicate threshold', async () => {
    const candidate = { ...event, id: 'next-session', event_date: '2030-01-08' }
    const callAi = vi
      .fn()
      .mockResolvedValueOnce(assessment)
      .mockResolvedValueOnce({
        duplicates: [
          { eventId: candidate.id, similarity: 65, reason: 'Different dated recurring session.' },
        ],
      })
    const result = await analyzeEvent(event, [candidate], callAi)
    expect(result.duplicates).toEqual([])
    expect(result.recommendation).toBe('approve')
  })
  it('fails the whole review when a duplicate batch is unavailable instead of presenting a partial pass', async () => {
    const callAi = vi
      .fn()
      .mockResolvedValueOnce(assessment)
      .mockRejectedValueOnce(new Error('Provider unavailable'))
    await expect(analyzeEvent(event, [{ ...event, id: 'candidate' }], callAi)).rejects.toThrow(
      'Provider unavailable',
    )
  })
})
