// Pure validation and scoring, shared with the admin client and unit tests.
export type RiskLevel = 'low' | 'medium' | 'high'
export type RiskCode =
  | 'illegal_content'
  | 'external_scam'
  | 'hate_speech'
  | 'low_quality'
  | 'missing_information'
  | 'duplicate'
export interface RiskFlag {
  code: RiskCode
  severity: RiskLevel
  reason: string
}
export interface DuplicateMatch {
  eventId: string
  title: string
  similarity: number
  reason: string
}
export interface AiModerationResult {
  riskLevel: RiskLevel
  flags: RiskFlag[]
  completenessScore: number
  missingFields: string[]
  duplicates: DuplicateMatch[]
  recommendation: 'approve' | 'request_changes' | 'reject'
  reason: string
  suggestedDescription: string | null
}
export interface AiReview {
  event_id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  result: AiModerationResult | null
  error_message: string | null
  updated_at: string
}
export interface EventContent {
  id: string
  organiser_id: string
  title: string
  description: string
  category: string
  event_date: string
  start_time: string
  end_time: string
  location: string | null
  online_link: string | null
  capacity: number
  image_url: string | null
}

const riskCodes: RiskCode[] = [
  'illegal_content',
  'external_scam',
  'hate_speech',
  'low_quality',
  'missing_information',
  'duplicate',
]
const riskLevels: RiskLevel[] = ['low', 'medium', 'high']
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid AI response.')
  return value as Record<string, unknown>
}
function string(value: unknown, max = 2000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new Error('Invalid AI response text.')
  return value.trim()
}
function list(value: unknown): unknown[] {
  if (!Array.isArray(value) || value.length > 100) throw new Error('Invalid AI response list.')
  return value
}

export function parseContentAssessment(value: unknown) {
  const data = record(value)
  const flags = list(data.flags).map((value): RiskFlag => {
    const flag = record(value)
    if (
      !riskCodes.includes(flag.code as RiskCode) ||
      !riskLevels.includes(flag.severity as RiskLevel)
    ) {
      throw new Error('Invalid AI risk flag.')
    }
    return {
      code: flag.code as RiskCode,
      severity: flag.severity as RiskLevel,
      reason: string(flag.reason),
    }
  })
  const quality = data.descriptionQuality
  if (typeof quality !== 'number' || !Number.isFinite(quality) || quality < 0 || quality > 40) {
    throw new Error('Invalid AI quality score.')
  }
  if (!['approve', 'request_changes', 'reject'].includes(String(data.recommendation)))
    throw new Error('Invalid AI recommendation.')
  return {
    flags,
    descriptionQuality: Math.round(quality),
    missingFields: list(data.missingFields).map((v) => string(v, 200)),
    recommendation: data.recommendation as AiModerationResult['recommendation'],
    reason: string(data.reason),
    suggestedDescription:
      data.suggestedDescription == null ? null : string(data.suggestedDescription, 12000),
  }
}

export function parseDuplicates(value: unknown, candidates: EventContent[]): DuplicateMatch[] {
  const data = record(value)
  const seen = new Set<string>()
  return list(data.duplicates)
    .map((value): DuplicateMatch => {
      const match = record(value)
      const candidate = candidates.find((event) => event.id === match.eventId)
      if (!candidate || seen.has(candidate.id))
        throw new Error('AI returned an unknown or duplicate event ID.')
      if (
        typeof match.similarity !== 'number' ||
        !Number.isFinite(match.similarity) ||
        match.similarity < 0 ||
        match.similarity > 100
      ) {
        throw new Error('Invalid AI similarity score.')
      }
      seen.add(candidate.id)
      return {
        eventId: candidate.id,
        title: candidate.title,
        similarity: Math.round(match.similarity),
        reason: string(match.reason),
      }
    })
    .filter((match) => match.similarity >= 80)
}

export function buildModerationResult(
  event: EventContent,
  assessment: ReturnType<typeof parseContentAssessment>,
  duplicates: DuplicateMatch[],
): AiModerationResult {
  const flags = [...assessment.flags]
  const missingFields = [...assessment.missingFields]
  let score = 0
  const title = event.title.trim()
  const description = event.description.trim()
  const isFiller = (text: string) =>
    /^(?:asdf|qwer(?:ty)?|test(?:ing)?|demo|placeholder|todo|测试|測試|待定|待补充)[\s\d!?.]*$/i.test(
      text,
    ) || /^(.)\1{3,}$/u.test(text)
  if (title.length >= 4 && !isFiller(title)) score += 20
  else missingFields.push('Meaningful event title')
  if (event.event_date && event.start_time && event.end_time) score += 20
  else missingFields.push('Event date and time')
  if (event.location?.trim() || event.online_link?.trim()) score += 20
  else missingFields.push('Venue or online meeting link')
  if (description.length < 20 || isFiller(description)) {
    missingFields.push('Detailed description, audience and agenda')
    flags.push({
      code: 'low_quality',
      severity: 'medium',
      reason: 'Description is too short or contains placeholder/test content.',
    })
  } else {
    score += assessment.descriptionQuality
    if (assessment.descriptionQuality < 20 && !flags.some((flag) => flag.code === 'low_quality')) {
      flags.push({
        code: 'low_quality',
        severity: 'medium',
        reason:
          'The description needs a clearer agenda, intended audience or participation instructions.',
      })
    }
  }
  if (missingFields.length)
    flags.push({
      code: 'missing_information',
      severity: 'medium',
      reason: `Please complete: ${[...new Set(missingFields)].join('; ')}.`,
    })
  duplicates.sort((a, b) => b.similarity - a.similarity)
  if (duplicates.length)
    flags.push({
      code: 'duplicate',
      severity: 'medium',
      reason: `Possible repeat submission by the same organiser: ${duplicates[0]!.title}. Check the date and session before deciding.`,
    })
  const riskLevel: RiskLevel =
    assessment.recommendation === 'reject' || flags.some((f) => f.severity === 'high')
      ? 'high'
      : assessment.recommendation === 'request_changes' ||
          flags.some((f) => f.severity === 'medium')
        ? 'medium'
        : 'low'
  const recommendation =
    riskLevel === 'high'
      ? 'reject'
      : riskLevel === 'medium' || score < 80
        ? 'request_changes'
        : assessment.recommendation
  const reason =
    recommendation !== 'approve' && assessment.recommendation === 'approve'
      ? flags.map((f) => f.reason).join('\n') || 'Please add more event details before publication.'
      : assessment.reason
  return {
    riskLevel,
    flags,
    completenessScore: score,
    missingFields: [...new Set(missingFields)],
    duplicates,
    recommendation,
    reason,
    suggestedDescription: riskLevel === 'high' ? null : assessment.suggestedDescription,
  }
}
