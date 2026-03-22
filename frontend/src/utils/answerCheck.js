import * as wanakana from 'wanakana'

/**
 * Normalize a string for comparison: lowercase, trim whitespace, collapse internal spaces.
 */
function normalizeMeaning(str) {
  return str.toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Check a meaning answer against the item.
 * Returns { correct: boolean, blacklisted: boolean }
 */
export function checkMeaning(input, item) {
  const normalized = normalizeMeaning(input)
  if (!normalized) return { correct: false, blacklisted: false }

  // Check blacklist first
  const isBlacklisted = (item.auxiliary_meanings || []).some(
    am => am.type === 'blacklist' && normalizeMeaning(am.meaning) === normalized
  )
  if (isBlacklisted) {
    return { correct: false, blacklisted: true }
  }

  // Check accepted meanings
  const acceptedMeanings = (item.meanings || []).filter(m => m.accepted_answer)
  const matchesMeaning = acceptedMeanings.some(
    m => normalizeMeaning(m.meaning) === normalized
  )
  if (matchesMeaning) return { correct: true, blacklisted: false }

  // Check user synonyms
  const synonyms = item.study_material?.meaning_synonyms || []
  const matchesSynonym = synonyms.some(
    s => normalizeMeaning(s) === normalized
  )
  if (matchesSynonym) return { correct: true, blacklisted: false }

  return { correct: false, blacklisted: false }
}

/**
 * Check a reading answer against the item.
 * Returns { correct: boolean }
 * Normalizes both input and accepted readings to hiragana before comparing.
 */
export function checkReading(input, item) {
  const normalized = input.trim()
  if (!normalized) return { correct: false }

  const inputHiragana = wanakana.toHiragana(normalized)

  const allReadings = item.readings || []
  const acceptedReadings = allReadings.filter(r => r.accepted_answer)

  const matches = acceptedReadings.some(r => wanakana.toHiragana(r.reading) === inputHiragana)
  if (matches) return { correct: true }

  // Check if input matches a valid but non-accepted reading (wrong reading type)
  const wrongType = allReadings.find(
    r => !r.accepted_answer && wanakana.toHiragana(r.reading) === inputHiragana
  )
  if (wrongType) {
    const expectedTypes = [...new Set(acceptedReadings.map(r => r.type).filter(Boolean))]
    return { correct: false, wrongReadingType: wrongType.type, expectedTypes }
  }

  return { correct: false }
}
