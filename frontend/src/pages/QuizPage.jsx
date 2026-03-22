import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QuizCard from '../components/QuizCard.jsx'
import MnemonicPanel from '../components/MnemonicPanel.jsx'
import UndoButton from '../components/UndoButton.jsx'
import * as wanakana from 'wanakana'
import { checkMeaning, checkReading } from '../utils/answerCheck.js'
import { renderMarkup } from '../utils/markup.jsx'

const API = import.meta.env.VITE_API_BASE_URL
const INITIAL_BATCH = 5
const BACKGROUND_CHUNK = 10
const LESSON_BATCH_SIZE = 5

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function needsReading(item) {
  return item.subject_type !== 'radical' && item.subject_type !== 'kana_vocabulary'
}

function getPrimaryMeaning(item) {
  return item.meanings.find(m => m.primary)?.meaning || item.meanings[0]?.meaning || ''
}

function getPrimaryReading(item) {
  return item.readings.find(r => r.primary)?.reading || item.readings[0]?.reading || ''
}

const SUBJECT_COLORS = {
  radical: 'bg-sky-500',
  kanji: 'bg-pink-600',
  vocabulary: 'bg-purple-600',
  kana_vocabulary: 'bg-purple-500',
}

const API_LESSON = import.meta.env.VITE_API_BASE_URL

function LessonInfoScreen({ item, onGotIt, batchProgress, batchSize, onStudyMaterialUpdate }) {
  const subjectColor = SUBJECT_COLORS[item.subject_type] || 'bg-gray-600'
  const hasAudio = (item.subject_type === 'vocabulary' || item.subject_type === 'kana_vocabulary')
    && item.pronunciation_audios?.length > 0

  const [showSynonymInput, setShowSynonymInput] = useState(false)
  const [synonymValue, setSynonymValue] = useState('')
  const [synonymLoading, setSynonymLoading] = useState(false)

  useEffect(() => {
    if (!hasAudio) return
    new Audio(item.pronunciation_audios[0].url).play().catch(() => {})
  }, [item.subject_id])

  async function handleAddSynonym() {
    const value = synonymValue.trim()
    if (!value) return
    setSynonymLoading(true)
    const studyMaterial = item.study_material
    const currentSynonyms = studyMaterial?.meaning_synonyms || []
    const newSynonyms = [...currentSynonyms, value]
    try {
      if (studyMaterial?.id) {
        const res = await fetch(`${API_LESSON}/api/study_materials/${studyMaterial.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meaning_synonyms: newSynonyms }),
        })
        if (!res.ok) throw new Error()
        onStudyMaterialUpdate({ ...studyMaterial, meaning_synonyms: newSynonyms })
      } else {
        const res = await fetch(`${API_LESSON}/api/study_materials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject_id: item.subject_id, meaning_synonyms: newSynonyms }),
        })
        if (!res.ok) throw new Error()
        const created = await res.json()
        onStudyMaterialUpdate({ id: created.data?.id, meaning_note: '', reading_note: '', meaning_synonyms: newSynonyms, ...created.data })
      }
      setSynonymValue('')
      setShowSynonymInput(false)
    } catch { } finally {
      setSynonymLoading(false)
    }
  }

  return (
    <div className="bg-gray-800 rounded-2xl overflow-hidden">
      <div className={`${subjectColor} px-6 py-4 flex items-center justify-between`}>
        <span className="text-white/80 text-sm font-medium capitalize">
          {item.subject_type.replace('_', ' ')} — Level {item.level}
        </span>
        <span className="text-white/60 text-xs">{batchProgress} / {batchSize}</span>
      </div>
      <div className="p-6 space-y-6">
        <div className="text-center">
          <p className="text-8xl font-bold text-white" style={{ fontFamily: '"Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", sans-serif' }}>
            {item.characters}
          </p>
          {hasAudio && (
            <button
              onClick={() => new Audio(item.pronunciation_audios[0].url).play().catch(() => {})}
              className="mt-3 flex items-center gap-2 mx-auto px-3 py-1.5 bg-blue-700/40 hover:bg-blue-600/50 text-blue-300 rounded-lg text-sm transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072" />
              </svg>
              Play Audio
            </button>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Meanings</p>
          <div className="flex flex-wrap gap-2">
            {item.meanings.map((m, i) => (
              <span key={i} className={`px-3 py-1 rounded-lg text-sm font-medium ${m.primary ? 'bg-white text-gray-900' : 'bg-gray-700 text-gray-200'}`}>
                {m.meaning}{m.primary && <span className="ml-1 text-xs text-gray-500">(primary)</span>}
              </span>
            ))}
          </div>
        </div>

        {needsReading(item) && item.readings.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Readings</p>
            <div className="flex flex-wrap gap-2">
              {item.readings.map((r, i) => (
                <span key={i} className={`px-3 py-1 rounded-lg text-sm font-medium ${r.primary ? 'bg-gray-100 text-gray-900' : 'bg-gray-700 text-gray-300'}`}
                  style={{ fontFamily: '"Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", sans-serif' }}>
                  {r.reading}{r.type && <span className="ml-1 text-xs text-gray-500">({r.type})</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {item.meaning_mnemonic && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Meaning Mnemonic</p>
            <p className="text-gray-200 text-sm leading-relaxed">{renderMarkup(item.meaning_mnemonic)}</p>
          </div>
        )}
        {item.reading_mnemonic && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Reading Mnemonic</p>
            <p className="text-gray-200 text-sm leading-relaxed">{renderMarkup(item.reading_mnemonic)}</p>
          </div>
        )}
        {item.kanji_mnemonics?.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Kanji Mnemonics</p>
            {item.kanji_mnemonics.map(({ kanji, mnemonic }) => (
              <div key={kanji} className="flex gap-3">
                <span className="text-2xl font-bold text-purple-300 leading-tight shrink-0" style={{ fontFamily: '"Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", sans-serif' }}>
                  {kanji}
                </span>
                <p className="text-gray-300 text-sm leading-relaxed">{mnemonic}</p>
              </div>
            ))}
          </div>
        )}

        {/* Synonyms */}
        {item.study_material?.meaning_synonyms?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wide mb-1">Your Synonyms</p>
            <div className="flex flex-wrap gap-1.5">
              {item.study_material.meaning_synonyms.map((syn, i) => (
                <span key={i} className="px-2 py-0.5 bg-yellow-900/40 border border-yellow-700/50 rounded text-yellow-200 text-xs">{syn}</span>
              ))}
            </div>
          </div>
        )}
        {!showSynonymInput ? (
          <button
            onClick={() => setShowSynonymInput(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 hover:bg-gray-600 text-gray-300 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Synonym
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={synonymValue}
              onChange={e => setSynonymValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.stopPropagation(); handleAddSynonym() }
                if (e.key === 'Escape') { setShowSynonymInput(false); setSynonymValue('') }
              }}
              placeholder="Enter synonym..."
              autoFocus
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
            />
            <button onClick={handleAddSynonym} disabled={synonymLoading || !synonymValue.trim()}
              className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:text-gray-400 rounded-lg text-xs font-medium text-white transition-all">
              {synonymLoading ? '...' : 'Add'}
            </button>
            <button onClick={() => { setShowSynonymInput(false); setSynonymValue('') }}
              className="px-2 py-1.5 text-gray-400 hover:text-gray-200 text-xs transition-colors">
              Cancel
            </button>
          </div>
        )}

        <button
          onClick={onGotIt}
          className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-lg rounded-xl transition-all active:scale-95"
        >
          {batchProgress < batchSize ? 'Got It — Next' : 'Got It — Start Quiz'}
        </button>
      </div>
    </div>
  )
}

export default function QuizPage({ mode }) {
  const navigate = useNavigate()

  // Assignment list [{assignment_id, subject_id, srs_stage}] — lightweight, shuffled
  const [assignments, setAssignments] = useState([])
  // Subject data keyed by subject_id
  const [enrichedItems, setEnrichedItems] = useState({})

  // Position in the assignment list
  const [currentIdx, setCurrentIdx] = useState(0)
  // Consecutive flow: meaning first, then reading
  const [phase, setPhase] = useState('meaning')
  const [incorrectMeaning, setIncorrectMeaning] = useState(0)
  const [incorrectReading, setIncorrectReading] = useState(0)

  // answerState: 'idle' | 'correct' | 'wrong-check' | 'incorrect' | 'blacklisted' | 'reading-in-meaning' | 'wrong-reading-type'
  const [answerState, setAnswerState] = useState('idle')
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [wrongAnswer, setWrongAnswer] = useState('')
  const [aiAccepted, setAiAccepted] = useState(false)
  const [wrongReadingTypeInfo, setWrongReadingTypeInfo] = useState(null) // {wrongType, expectedTypes}

  // Undo: snapshot of state before the last submitted answer
  const [undoSnapshot, setUndoSnapshot] = useState(null)

  // Tracks phase + incorrect counts for items re-queued after a wrong answer
  const savedItemStateRef = React.useRef({})

  // Lessons only: batch learning before quizzing
  const [lessonBatchPhase, setLessonBatchPhase] = useState('learning') // 'learning' | 'quizzing'
  const [lessonBatchStart, setLessonBatchStart] = useState(0)
  const [lessonLearnIdx, setLessonLearnIdx] = useState(0)

  const [completed, setCompleted] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fetchingMore, setFetchingMore] = useState(false)
  const [error, setError] = useState(null)
  const [sessionDone, setSessionDone] = useState(false)

  // Derived current item (merges assignment fields into subject data)
  const assignment = assignments[currentIdx]
  const subjectData = assignment ? enrichedItems[assignment.subject_id] : null
  const currentItem = assignment && subjectData
    ? { ...subjectData, assignment_id: assignment.assignment_id, srs_stage: assignment.srs_stage }
    : null
  const waitingForSubject = assignment && !subjectData

  // Derived item for the learning phase (separate from quiz currentIdx)
  const lessonBatchSize = Math.min(LESSON_BATCH_SIZE, assignments.length - lessonBatchStart)
  const learningAssignment = mode === 'lessons' && lessonBatchPhase === 'learning'
    ? assignments[lessonBatchStart + lessonLearnIdx]
    : null
  const learningSubject = learningAssignment ? enrichedItems[learningAssignment.subject_id] : null
  const currentLessonItem = learningAssignment && learningSubject
    ? { ...learningSubject, assignment_id: learningAssignment.assignment_id, srs_stage: learningAssignment.srs_stage }
    : null

  // ── Data fetching ────────────────────────────────────────────────────────

  async function fetchSubjectBatch(subjectIds) {
    if (!subjectIds.length) return
    try {
      const r = await fetch(`${API}/api/subjects/batch?ids=${subjectIds.join(',')}`)
      if (!r.ok) return
      const items = await r.json()
      setEnrichedItems(prev => {
        const next = { ...prev }
        items.forEach(item => { next[item.subject_id] = item })
        return next
      })
    } catch { /* best-effort */ }
  }

  async function loadRemainingSubjects(remaining) {
    for (let i = 0; i < remaining.length; i += BACKGROUND_CHUNK) {
      await fetchSubjectBatch(remaining.slice(i, i + BACKGROUND_CHUNK).map(a => a.subject_id))
    }
  }

  async function loadAssignments(isRefetch = false) {
    try {
      const r = await fetch(`${API}/api/assignments?mode=${mode}`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()

      if (!data.length) {
        setSessionDone(true)
        setLoading(false)
        setFetchingMore(false)
        return
      }

      const ordered = mode === 'lessons' ? data : shuffle(data)
      setAssignments(ordered)
      setCurrentIdx(0)
      setPhase('meaning')
      setIncorrectMeaning(0)
      setIncorrectReading(0)
      setAnswerState('idle')
      setCorrectAnswer('')
      setUndoSnapshot(null)
      if (mode === 'lessons') {
        setLessonBatchPhase('learning')
        setLessonBatchStart(0)
        setLessonLearnIdx(0)
      }

      // Show first item as soon as the first small batch is ready
      await fetchSubjectBatch(ordered.slice(0, INITIAL_BATCH).map(a => a.subject_id))
      setLoading(false)
      setFetchingMore(false)

      // Load the rest silently in the background
      loadRemainingSubjects(ordered.slice(INITIAL_BATCH))
    } catch (err) {
      if (!isRefetch) setError(err.message)
      else setSessionDone(true)
      setLoading(false)
      setFetchingMore(false)
    }
  }

  useEffect(() => { loadAssignments() }, [mode])

  // ── Actions ──────────────────────────────────────────────────────────────

  async function submitReview(assignmentId, incorrectMeaningCount, incorrectReadingCount) {
    try {
      await fetch(`${API}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: assignmentId,
          incorrect_meaning_answers: incorrectMeaningCount,
          incorrect_reading_answers: incorrectReadingCount,
        }),
      })
    } catch (err) {
      console.error('Failed to submit review:', err)
    }
  }

  function applyItemStartState(assignmentId) {
    const saved = savedItemStateRef.current[assignmentId]
    if (saved) {
      delete savedItemStateRef.current[assignmentId]
      setPhase(saved.phase)
      setIncorrectMeaning(saved.incorrectMeaning)
      setIncorrectReading(saved.incorrectReading)
    } else {
      setPhase('meaning')
      setIncorrectMeaning(0)
      setIncorrectReading(0)
    }
    setAnswerState('idle')
    setCorrectAnswer('')
    setUndoSnapshot(null)
    setAiAccepted(false)
  }

  function advanceToNext() {
    const nextIdx = currentIdx + 1

    if (mode === 'lessons') {
      const batchEnd = lessonBatchStart + lessonBatchSize
      if (nextIdx < batchEnd) {
        // Still within current batch
        setCurrentIdx(nextIdx)
        applyItemStartState(assignments[nextIdx].assignment_id)
      } else if (batchEnd < assignments.length) {
        // Start learning phase for next batch
        const nextBatchSize = Math.min(LESSON_BATCH_SIZE, assignments.length - batchEnd)
        setLessonBatchStart(batchEnd)
        setLessonLearnIdx(0)
        setLessonBatchPhase('learning')
        setCurrentIdx(batchEnd)
        setPhase('meaning')
        setIncorrectMeaning(0)
        setIncorrectReading(0)
        setAnswerState('idle')
        setCorrectAnswer('')
        setUndoSnapshot(null)
        setAiAccepted(false)
      } else {
        setSessionDone(true)
      }
      return
    }

    if (nextIdx >= assignments.length) {
      setFetchingMore(true)
      loadAssignments(true)
    } else {
      setCurrentIdx(nextIdx)
      applyItemStartState(assignments[nextIdx].assignment_id)
    }
  }

  function reQueueCurrent() {
    const asgn = assignments[currentIdx]

    // Save current phase + incorrect counts to restore when we come back
    savedItemStateRef.current[asgn.assignment_id] = { phase, incorrectMeaning, incorrectReading }

    // Re-insert at a random future position, capped to current batch for lessons
    const copy = [...assignments]
    copy.splice(currentIdx, 1)
    const batchEnd = mode === 'lessons' ? lessonBatchStart + lessonBatchSize - 1 : copy.length
    const rangeEnd = Math.min(batchEnd, copy.length)
    const remaining = rangeEnd - currentIdx
    const offset = remaining === 0 ? 0 : 1 + Math.floor(Math.random() * remaining)
    copy.splice(currentIdx + Math.min(offset, copy.length - currentIdx), 0, asgn)
    setAssignments(copy)

    // Transition: currentIdx now points to the next item (or back to the re-queued one if last)
    if (remaining === 0) {
      // Only item — restore saved state (effectively re-asks same question in place)
      const saved = savedItemStateRef.current[asgn.assignment_id]
      delete savedItemStateRef.current[asgn.assignment_id]
      setPhase(saved.phase)
      setIncorrectMeaning(saved.incorrectMeaning)
      setIncorrectReading(saved.incorrectReading)
    } else {
      applyItemStartState(copy[currentIdx].assignment_id)
    }
    setWrongAnswer('')
  }

  async function handleLessonLearnNext() {
    if (!currentLessonItem) return

    if (lessonLearnIdx + 1 < lessonBatchSize) {
      setLessonLearnIdx(prev => prev + 1)
    } else {
      // All items in batch learned — start all assignments then begin quiz
      const batchAssignments = assignments.slice(lessonBatchStart, lessonBatchStart + lessonBatchSize)
      await Promise.allSettled(
        batchAssignments.map(a =>
          fetch(`${API}/api/assignments/${a.assignment_id}/start`, { method: 'PUT' })
        )
      )
      setLessonBatchPhase('quizzing')
      setCurrentIdx(lessonBatchStart)
      setPhase('meaning')
      setIncorrectMeaning(0)
      setIncorrectReading(0)
      setAnswerState('idle')
      setCorrectAnswer('')
      setUndoSnapshot(null)
      setAiAccepted(false)
    }
  }

  // Auto-play audio on correct reading answer
  useEffect(() => {
    if (answerState !== 'correct') return
    const shouldPlay = phase === 'reading' || !needsReading(currentItem)
    if (!shouldPlay) return
    const audios = currentItem?.pronunciation_audios
    if (!audios?.length) return
    const el = new Audio(audios[0].url)
    el.play().catch(() => {})
  }, [answerState])

  const handleNextRef = React.useRef(null)
  const handleUndoRef = React.useRef(null)
  const handleLessonLearnNextRef = React.useRef(null)

  // Swipe gestures: left → next/got-it, right → undo
  const swipeTouchStart = React.useRef(null)
  function onTouchStart(e) {
    const t = e.touches[0]
    swipeTouchStart.current = { x: t.clientX, y: t.clientY }
  }
  function onTouchEnd(e) {
    if (!swipeTouchStart.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - swipeTouchStart.current.x
    const dy = t.clientY - swipeTouchStart.current.y
    swipeTouchStart.current = null
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return // too short or mostly vertical
    if (dx < 0) {
      // Swipe left → next / got it
      if (mode === 'lessons' && lessonBatchPhase === 'learning') {
        handleLessonLearnNextRef.current?.()
      } else if (answerState === 'correct' || answerState === 'incorrect' || answerState === 'blacklisted') {
        handleNextRef.current?.()
      }
    } else {
      // Swipe right → undo
      handleUndoRef.current?.()
    }
  }

  // Enter to advance lesson learning screen
  useEffect(() => {
    if (mode !== 'lessons' || lessonBatchPhase !== 'learning') return
    function onKeyDown(e) {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleLessonLearnNext()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mode, lessonBatchPhase, lessonLearnIdx, lessonBatchSize, currentLessonItem])

  // Ctrl+Z / Cmd+Z keyboard shortcut for undo
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (handleUndoRef.current) {
          e.preventDefault()
          handleUndoRef.current()
        }
      }
      // Enter to advance when in a confirmed answer state
      if (e.key === 'Enter' && (answerState === 'correct' || answerState === 'incorrect' || answerState === 'blacklisted')) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          handleNextRef.current?.()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [answerState])

  async function checkMeaningWithAI(input, item) {
    try {
      const r = await fetch(`${API}/api/check_meaning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_answer: input,
          accepted_meanings: item.meanings.filter(m => m.accepted_answer).map(m => m.meaning),
          characters: item.characters,
          subject_type: item.subject_type,
        }),
      })
      if (!r.ok) return false
      const data = await r.json()
      return data.accepted === true
    } catch {
      return false
    }
  }

  async function handleAnswer(input) {
    if (answerState !== 'idle' || !currentItem) return

    // Kana or romaji reading entered for meaning → warn without penalty
    // But skip the warning if the input is also a valid meaning (e.g. "haiku")
    if (phase === 'meaning') {
      const isKana = /[\u3040-\u309f\u30a0-\u30ff]/.test(input)
      const asHiragana = wanakana.toHiragana(input.trim())
      const matchesReading = (currentItem.readings || []).some(
        r => wanakana.toHiragana(r.reading) === asHiragana
      )
      if (isKana || matchesReading) {
        const alsoMeaning = checkMeaning(input, currentItem)
        if (!alsoMeaning.correct) {
          setAnswerState('reading-in-meaning')
          return
        }
      }
    }

    // Snapshot before this answer so undo can restore it
    setUndoSnapshot({ phase, incorrectMeaning, incorrectReading })

    const result = phase === 'meaning'
      ? checkMeaning(input, currentItem)
      : checkReading(input, currentItem)

    if (result.blacklisted) {
      setAnswerState('blacklisted')
      setIncorrectMeaning(prev => prev + 1)
      return
    }

    if (result.correct) {
      setAnswerState('correct')
    } else if (phase === 'meaning') {
      // Run AI synonym check before showing wrong-check screen
      setWrongAnswer(input)
      setCorrectAnswer(getPrimaryMeaning(currentItem))
      setAnswerState('checking')
      const accepted = await checkMeaningWithAI(input, currentItem)
      if (accepted) {
        setAnswerState('correct')
        setAiAccepted(true)
        setUndoSnapshot(null)
      } else {
        setAnswerState('wrong-check')
      }
    } else {
      // Reading — exact match only, no AI check
      setWrongAnswer(input)
      setCorrectAnswer(getPrimaryReading(currentItem))
      if (result.wrongReadingType) {
        setWrongReadingTypeInfo({ wrongType: result.wrongReadingType, expectedTypes: result.expectedTypes })
        setAnswerState('wrong-reading-type')
      } else {
        setAnswerState('wrong-check')
      }
    }
  }

  function handleConfirmWrong() {
    if (phase === 'meaning') setIncorrectMeaning(prev => prev + 1)
    else setIncorrectReading(prev => prev + 1)
    setAnswerState('incorrect')
  }

  function handleNext() {
    if (!currentItem) return

    if (answerState === 'correct') {
      if (phase === 'meaning' && needsReading(currentItem)) {
        setPhase('reading')
        setAnswerState('idle')
        setCorrectAnswer('')
        setUndoSnapshot(null)
      } else {
        submitReview(currentItem.assignment_id, incorrectMeaning, incorrectReading)
        setCompleted(prev => prev + 1)
        advanceToNext()
      }
    } else {
      // incorrect / blacklisted — shuffle back into queue
      reQueueCurrent()
    }
  }
  handleNextRef.current = handleNext

  function handleUndo() {
    if (!undoSnapshot) return
    setPhase(undoSnapshot.phase)
    setIncorrectMeaning(undoSnapshot.incorrectMeaning)
    setIncorrectReading(undoSnapshot.incorrectReading)
    setAnswerState('idle')
    setCorrectAnswer('')
    setWrongAnswer('')
    setUndoSnapshot(null)
  }
  handleUndoRef.current = handleUndo
  handleLessonLearnNextRef.current = handleLessonLearnNext

  function handleStudyMaterialUpdate(newStudyMaterial) {
    if (!assignment) return
    setEnrichedItems(prev => ({
      ...prev,
      [assignment.subject_id]: { ...prev[assignment.subject_id], study_material: newStudyMaterial },
    }))
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400">Loading {mode}...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-red-900/50 border border-red-700 rounded-xl p-6 text-center max-w-sm">
          <p className="text-red-300 font-medium mb-1">Failed to load {mode}</p>
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors">
            Go back
          </button>
        </div>
      </div>
    )
  }

  if (fetchingMore) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400">Loading next batch...</p>
          <p className="text-gray-500 text-sm">{completed} completed so far</p>
        </div>
      </div>
    )
  }

  if (sessionDone) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-sm">
          <div className="text-6xl">🎉</div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {mode === 'lessons' ? 'Lessons Complete!' : 'Reviews Complete!'}
            </h2>
            <p className="text-gray-400">You completed {completed} item{completed !== 1 ? 's' : ''} this session.</p>
          </div>
          <button onClick={() => navigate('/')} className="px-8 py-3 bg-pink-600 hover:bg-pink-500 text-white font-semibold rounded-xl transition-all active:scale-95">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const remaining = assignments.length - currentIdx

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </button>
          <div className="text-center">
            <p className="text-white font-semibold capitalize">{mode}</p>
            <p className="text-gray-400 text-xs">{remaining} remaining</p>
          </div>
          <div className="text-right text-sm text-gray-400">{completed} done</div>
        </div>
        <div className="max-w-2xl mx-auto mt-2">
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-pink-500 rounded-full transition-all duration-300"
              style={{ width: completed + remaining > 0 ? `${Math.round((completed / (completed + remaining)) * 100)}%` : '0%' }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start px-4 py-6 max-w-2xl mx-auto w-full" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

        {/* Lesson learning phase */}
        {mode === 'lessons' && lessonBatchPhase === 'learning' && currentLessonItem && (
          <div className="w-full">
            <LessonInfoScreen
              item={currentLessonItem}
              onGotIt={handleLessonLearnNext}
              batchProgress={lessonLearnIdx + 1}
              batchSize={lessonBatchSize}
              onStudyMaterialUpdate={sm => {
                setEnrichedItems(prev => ({
                  ...prev,
                  [learningAssignment.subject_id]: { ...prev[learningAssignment.subject_id], study_material: sm },
                }))
              }}
            />
            <p className="text-center text-gray-500 text-sm mt-3">
              {assignments.length - lessonBatchStart - lessonBatchSize > 0
                ? `${assignments.length - lessonBatchStart - lessonBatchSize} more lesson${assignments.length - lessonBatchStart - lessonBatchSize !== 1 ? 's' : ''} after this batch`
                : 'Last batch'}
            </p>
          </div>
        )}

        {/* Waiting for background subject fetch */}
        {waitingForSubject && !(mode === 'lessons' && lessonBatchPhase === 'learning') && (
          <div className="flex flex-col items-center gap-3 mt-16">
            <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Loading item...</p>
          </div>
        )}

        {/* Quiz */}
        {!(mode === 'lessons' && lessonBatchPhase === 'learning') && currentItem && (
          <div className="w-full space-y-4">
            <QuizCard
              key={`${assignment?.assignment_id}-${phase}`}
              item={currentItem}
              questionType={phase}
              answerState={answerState}
              correctAnswer={correctAnswer}
              onSubmit={handleAnswer}
            />

            {/* AI synonym check in progress */}
            {answerState === 'checking' && (
              <div className="bg-gray-800 border border-blue-600 rounded-xl p-4 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
                <p className="text-blue-300 text-sm">Checking with AI...</p>
              </div>
            )}

            {/* Reading entered for meaning — warn, no penalty */}
            {answerState === 'reading-in-meaning' && (
              <div className="bg-yellow-900/40 border border-yellow-600 rounded-xl p-4 space-y-3">
                <p className="text-yellow-300 font-medium">That looks like a reading, not a meaning!</p>
                <button
                  onClick={() => setAnswerState('idle')}
                  className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all active:scale-95"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Wrong reading type — warn without penalty */}
            {answerState === 'wrong-reading-type' && wrongReadingTypeInfo && (
              <div className="bg-yellow-900/40 border border-yellow-600 rounded-xl p-4 space-y-3">
                <p className="text-yellow-300 font-medium">
                  That's the {wrongReadingTypeInfo.wrongType}
                  {wrongReadingTypeInfo.expectedTypes?.length > 0 && (
                    <>, not the {wrongReadingTypeInfo.expectedTypes.join(' / ')}</>
                  )}!
                </p>
                <button
                  onClick={() => { setAnswerState('idle'); setWrongReadingTypeInfo(null); setUndoSnapshot(null) }}
                  className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all active:scale-95"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Typo check — show before revealing correct answer */}
            {answerState === 'wrong-check' && (
              <div className="bg-yellow-900/40 border border-yellow-600 rounded-xl p-4 space-y-3">
                <p className="text-yellow-200 text-sm">Your answer: <span className="font-semibold text-white">{wrongAnswer}</span></p>
                <div className="flex gap-2">
                  <button
                    onClick={handleUndo}
                    className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all active:scale-95"
                  >
                    Typo
                  </button>
                  <button
                    onClick={() => { setAnswerState('correct'); setUndoSnapshot(null) }}
                    className="flex-1 py-2.5 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-xl transition-all active:scale-95"
                  >
                    Accept
                  </button>
                  <button
                    onClick={handleConfirmWrong}
                    className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-xl transition-all active:scale-95"
                  >
                    Wrong
                  </button>
                </div>
              </div>
            )}

            {/* Confirmed answer — correct / incorrect / blacklisted */}
            {(answerState === 'correct' || answerState === 'incorrect' || answerState === 'blacklisted') && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={handleNext}
                    className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all active:scale-95"
                  >
                    {answerState === 'correct' && phase === 'meaning' && needsReading(currentItem)
                      ? 'Next → Reading'
                      : answerState === 'correct'
                      ? 'Next Item'
                      : 'Next'}
                  </button>
                  {answerState === 'correct' && aiAccepted && (
                    <button
                      onClick={() => { setAiAccepted(false); handleConfirmWrong() }}
                      className="px-4 py-2.5 bg-red-900/60 hover:bg-red-800 text-red-300 text-sm font-medium rounded-xl transition-all active:scale-95"
                      title="AI accepted this but you want to mark it wrong"
                    >
                      Mark wrong
                    </button>
                  )}
                  <UndoButton onUndo={handleUndo} disabled={!undoSnapshot} />
                </div>
                <MnemonicPanel
                  item={currentItem}
                  questionType={phase}
                  audioEnabled={phase === 'reading' || !needsReading(currentItem)}
                  onStudyMaterialUpdate={handleStudyMaterialUpdate}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
