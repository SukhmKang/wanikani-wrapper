import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as wanakana from 'wanakana'
import { showToast } from '../utils/toast.js'
import { Furigana } from '@furigana-react/furigana'

const API = import.meta.env.VITE_API_BASE_URL

// Extract bolded words from translation HTML as a word-level hint
function extractWordHint(translation) {
  const matches = []
  const regex = /<strong>([^<]+)<\/strong>/g
  let m
  while ((m = regex.exec(translation)) !== null) {
    matches.push(m[1])
  }
  return matches.join(' / ')
}

function checkAnswer(input, item) {
  const norm = s => wanakana.toHiragana(s.trim().toLowerCase())
  const inputNorm = norm(input)
  if (!inputNorm) return false
  const sq = item.study_question
  const answers = [sq.answer, ...(sq.alternate_grammar || [])].filter(Boolean)
  return answers.some(a => norm(a) === inputNorm)
}

// Only match kanji (and 々) before （reading） — never hiragana/katakana particles
const FURIGANA_RE = /([\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3005]+)（([^）]+)）/g
const BLANK_RE = /<span[^>]*class=["']study-area-input["'][^>]*>.*?<\/span>/i

// Render sentence with per-word click-to-reveal furigana
function SentenceDisplay({ content, revealed, revealText }) {
  const [shown, setShown] = useState(new Set())

  useEffect(() => { setShown(new Set()) }, [content])

  function toggle(key) {
    setShown(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function parseSegment(text, prefix) {
    const items = []
    let last = 0
    let group = null // { key, end, matches: [{base, reading}] }
    let m
    FURIGANA_RE.lastIndex = 0

    while ((m = FURIGANA_RE.exec(text)) !== null) {
      const matchEnd = m.index + m[0].length
      if (group && m.index === group.end) {
        // Adjacent to current group — merge in
        group.matches.push({ base: m[1], reading: m[2] })
        group.end = matchEnd
      } else {
        // Gap — flush current group, push intervening text, start new group
        if (group) items.push({ type: 'group', ...group })
        if (m.index > last) items.push({ type: 'text', content: text.slice(last, m.index) })
        group = { key: `${prefix}-${m.index}`, end: matchEnd, matches: [{ base: m[1], reading: m[2] }] }
      }
      last = matchEnd
    }
    if (group) items.push({ type: 'group', ...group })
    if (last < text.length) items.push({ type: 'text', content: text.slice(last) })

    return items.map(item =>
      item.type === 'text' ? item.content : (
        <span key={item.key} onClick={() => toggle(item.key)} className="bp-word">
          {item.matches.map((match, i) => (
            <Furigana key={i} furigana={match.reading} visible={shown.has(item.key)}>
              {match.base}
            </Furigana>
          ))}
        </span>
      )
    )
  }

  const filled = content.replace(BLANK_RE, revealed ? ` ${revealText} ` : ' ______ ')
  return parseSegment(filled, 's')
}

export default function BunproQuizPage() {
  const navigate = useNavigate()
  const [currentItem, setCurrentItem] = useState(null)
  const [reviewSessionId, setReviewSessionId] = useState(null)
  const [answerState, setAnswerState] = useState('idle') // idle | correct | incorrect
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [answered, setAnswered] = useState(0)
  const [hintLevel, setHintLevel] = useState(0) // 0=none 1=translation 2=nuance 3=nuance_translation
  const [showAnswer, setShowAnswer] = useState(false)
  const [aiFeedback, setAiFeedback] = useState(null) // null | 'loading' | string
  const lastAnswerRef = useRef(null)

  const inputRef = useRef(null)
  const wanakanaRef = useRef(null)
  const audioRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingRef = useRef(false)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)

  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches

  async function handleAnalyze() {
    if (!currentItem || aiFeedback) return
    setAiFeedback('loading')
    const sq = currentItem.study_question
    try {
      const r = await fetch(`${API}/api/bunpro/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_answer: lastAnswerRef.current || '',
          correct_answer: sq.kanji_answer || sq.answer,
          sentence: sq.content,
          translation: sq.translation,
          reviewable_type: currentItem.reviewable_type || '',
          nuance_translation: sq.nuance_translation,
        }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      setAiFeedback(data.feedback)
    } catch (err) {
      setAiFeedback(`Failed to analyze: ${err.message}`)
    }
  }

  async function fetchNext() {
    setLoading(true)
    setAnswerState('idle')
    setAiFeedback(null)
    lastAnswerRef.current = null
    try {
      const r = await fetch(`${API}/api/bunpro/queue`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      setReviewSessionId(data.review_session_id)
      setHintLevel(0)
      setShowAnswer(false)
      if (!data.items?.length) {
        setDone(true)
        setCurrentItem(null)
      } else {
        setCurrentItem(data.items[0])
        setDone(false)
      }
    } catch (err) {
      showToast(`Failed to load: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchNext() }, [])

  // Bind wanakana on new item
  useEffect(() => {
    if (!inputRef.current || answerState !== 'idle') return
    const el = inputRef.current
    el.value = ''
    wanakana.bind(el, { IMEMode: true })
    wanakanaRef.current = el
    setTimeout(() => el.focus(), 50)
    return () => {
      if (wanakanaRef.current) {
        try { wanakana.unbind(wanakanaRef.current) } catch (e) {}
        wanakanaRef.current = null
      }
    }
  }, [currentItem?.review_id])

  // Re-focus when returning to idle (undo)
  useEffect(() => {
    if (answerState === 'idle' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [answerState])

  // Ctrl+Space mic shortcut
  useEffect(() => {
    function onKeyDown(e) {
      if (e.code !== 'Space' || !e.ctrlKey) return
      if (answerState !== 'idle') return
      if (recordingRef.current || transcribing) return
      e.preventDefault()
      recordingRef.current = true
      handleMicStart()
    }
    function onKeyUp(e) {
      if (e.code !== 'Space') return
      if (!recordingRef.current) return
      e.preventDefault()
      recordingRef.current = false
      handleMicStop()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [answerState, transcribing])

  // Enter to advance after answering
  useEffect(() => {
    function onKeyDown(e) {
      if (e.code !== 'Enter') return
      if (answerState === 'correct' || answerState === 'incorrect') {
        e.preventDefault()
        handleNext()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [answerState, currentItem, reviewSessionId])

  function handleSubmit(e) {
    e?.preventDefault()
    const val = inputRef.current?.value || ''
    if (!val.trim() || answerState !== 'idle') return
    lastAnswerRef.current = val.trim()
    const correct = checkAnswer(val.trim(), currentItem)
    setAnswerState(correct ? 'correct' : 'incorrect')
    if (correct) {
      const url = currentItem.study_question.female_audio_url || currentItem.study_question.male_audio_url
      if (url) {
        audioRef.current = new Audio(url)
        audioRef.current.play().catch(() => {})
      }
    }
  }

  async function handleNext() {
    if (submitting) return
    setSubmitting(true)
    try {
      const r = await fetch(`${API}/api/bunpro/reviews/${currentItem.review_id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_session_id: reviewSessionId,
          correct: answerState === 'correct',
        }),
      })
      if (!r.ok) showToast(`Submit failed: HTTP ${r.status}`)
    } catch (err) {
      showToast(`Submit failed: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
    setAnswered(n => n + 1)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    await fetchNext()
  }

  function handleUndo() {
    setShowAnswer(false)
    setAiFeedback(null)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setAnswerState('idle')
    if (inputRef.current) {
      inputRef.current.value = ''
      // Re-bind wanakana since it was unbound on answered state
      if (!wanakanaRef.current) {
        wanakana.bind(inputRef.current, { IMEMode: true })
        wanakanaRef.current = inputRef.current
      }
    }
  }

  async function handleMicStart() {
    if (transcribing) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      const mimeType = ['audio/webm', 'audio/mp4', 'audio/ogg'].find(t => MediaRecorder.isTypeSupported(t)) || ''
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = mr
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.start()
      setRecording(true)
    } catch (err) {
      showToast(`Microphone error: ${err.message}`)
    }
  }

  async function handleMicStop() {
    const mr = mediaRecorderRef.current
    if (!mr || mr.state === 'inactive') return
    setRecording(false)
    setTranscribing(true)
    await new Promise(resolve => {
      mr.onstop = resolve
      mr.stop()
      mr.stream?.getTracks().forEach(t => t.stop())
    })
    const mimeType = mr.mimeType || 'audio/webm'
    const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
    const blob = new Blob(audioChunksRef.current, { type: mimeType })
    const formData = new FormData()
    formData.append('file', blob, `recording.${ext}`)
    formData.append('language', 'ja')
    try {
      const res = await fetch(`${API}/api/transcribe`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.transcript) {
        const text = data.transcript.replace(/[。．.、,，!！?？\s]+$/, '').trim()
        if (inputRef.current) {
          inputRef.current.value = text
          inputRef.current.dispatchEvent(new Event('input', { bubbles: true }))
        }
        inputRef.current?.focus()
      }
    } catch (err) {
      showToast(`Transcription failed: ${err.message}`)
    } finally {
      setTranscribing(false)
    }
  }

  if (loading && !currentItem) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading reviews...</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <p className="text-6xl mb-4">🎉</p>
          <h2 className="text-3xl font-bold text-white mb-2">All done!</h2>
          <p className="text-gray-400">You answered {answered} review{answered !== 1 ? 's' : ''}</p>
          <button
            onClick={() => navigate('/bunpro')}
            className="mt-8 px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl transition-all active:scale-95"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const isAnswered = answerState !== 'idle'
  const sq = currentItem?.study_question
  const cardBg = answerState === 'correct'
    ? 'bg-green-900/80 border-green-600'
    : answerState === 'incorrect'
    ? 'bg-red-900/80 border-red-600'
    : 'bg-gray-800 border-gray-700'

  return (
    <div
      className="min-h-screen bg-gray-900 flex flex-col"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => navigate('/bunpro')}
          className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
        >
          ✕
        </button>
        <span className="text-gray-400 text-sm">{answered} answered</span>
        {sq?.level ? (
          <span className="text-teal-400 text-xs font-semibold bg-teal-900/40 px-2 py-1 rounded-full">{sq.level}</span>
        ) : <span />}
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col px-4 pb-8 max-w-lg mx-auto w-full">
        <div className={`rounded-2xl border-2 transition-colors duration-300 overflow-hidden mt-2 ${cardBg}`}>
          {/* Type badge */}
          <div className="bg-teal-700 px-6 py-3">
            <span className="text-white/80 text-sm font-medium">
              {currentItem?.reviewable_type || 'Review'}
            </span>
          </div>

          {/* Sentence */}
          <div className="px-6 pt-8 pb-6">
            <p className="text-xl text-white text-center" style={{ lineHeight: '2.8' }}>
              <SentenceDisplay
                content={sq?.content || ''}
                revealed={isAnswered}
                revealText={sq?.kanji_answer || sq?.answer || ''}
              />

            </p>
            {isAnswered && sq?.translation && (
              <p
                className="text-gray-300 text-sm text-center mt-3 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sq.translation }}
              />
            )}
          </div>

          {/* Answer form + feedback + buttons */}
          <div className="px-6 pb-6 space-y-3">
            <form onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="text"
                defaultValue=""
                disabled={isAnswered}
                autoFocus
                placeholder="Answer..."
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                className={`w-full bg-gray-700 border rounded-xl px-4 py-3 text-white text-lg placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                  answerState === 'correct'
                    ? 'border-green-500 focus:ring-green-500'
                    : answerState === 'incorrect'
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-600 focus:ring-teal-500 focus:border-teal-500'
                } ${isAnswered ? 'opacity-75 cursor-not-allowed' : ''}`}
              />
            </form>

            {/* Result feedback */}
            {answerState === 'correct' && (
              <div className="flex items-center gap-2 text-green-400 font-medium">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Correct!
              </div>
            )}
            {answerState === 'incorrect' && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-red-400 font-medium">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Incorrect
                </div>
                <div className="flex items-center gap-3">
                  {showAnswer ? (
                    <p className="text-gray-300 text-sm">
                      Correct answer: <span className="text-white font-medium">{sq?.kanji_answer || sq?.answer}</span>
                    </p>
                  ) : (
                    <button
                      onClick={() => setShowAnswer(true)}
                      className="text-gray-500 hover:text-gray-300 text-sm underline transition-colors"
                    >
                      Show answer
                    </button>
                  )}
                  {!aiFeedback && (
                    <button
                      onClick={handleAnalyze}
                      className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Analyze
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Nuance shown after answering */}
            {isAnswered && sq?.nuance_translation && (
              <p className="text-gray-400 text-sm italic leading-relaxed" dangerouslySetInnerHTML={{ __html: sq.nuance_translation }} />
            )}

            {/* Buttons */}
            <div className="flex gap-2">
              {!isAnswered ? (
                <>
                  <button
                    type="button"
                    onClick={() => setHintLevel(l => (l + 1) % 5)}
                    className={`px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 select-none text-sm ${
                      hintLevel > 0
                        ? 'bg-yellow-700/60 text-yellow-200'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-400'
                    }`}
                    title="Cycle hint level"
                  >
                    Hint
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2.5 rounded-xl transition-all active:scale-95 select-none"
                  >
                    Submit
                  </button>
                  <button
                    type="button"
                    onClick={isTouchDevice ? (recording ? handleMicStop : handleMicStart) : undefined}
                    onMouseDown={!isTouchDevice ? handleMicStart : undefined}
                    onMouseUp={!isTouchDevice ? handleMicStop : undefined}
                    disabled={transcribing}
                    className={`px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 select-none ${
                      recording
                        ? 'bg-red-600 text-white animate-pulse'
                        : transcribing
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }`}
                    title={isTouchDevice ? 'Tap to record / tap to stop' : 'Hold to record (or hold Ctrl+Space)'}
                  >
                    {transcribing ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleUndo}
                    className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium rounded-xl transition-all active:scale-95 select-none"
                  >
                    Undo
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={submitting}
                    className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2.5 rounded-xl transition-all active:scale-95 select-none disabled:opacity-60"
                  >
                    {submitting ? 'Saving...' : 'Next →'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* AI feedback — shown after incorrect answer */}
        {answerState === 'incorrect' && aiFeedback && (
          <div className="mt-3 bg-purple-950/60 border border-purple-800/50 rounded-xl px-4 py-3 text-sm space-y-1.5">
            <p className="text-purple-400 text-xs uppercase tracking-wide font-medium">AI Analysis</p>
            {aiFeedback === 'loading' ? (
              <div className="flex items-center gap-2 text-gray-400">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </div>
            ) : (
              <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{aiFeedback}</p>
            )}
          </div>
        )}

        {/* Hint display — below card so button position never shifts */}
        {!isAnswered && hintLevel > 0 && (
          <div className="mt-3 bg-gray-800/80 rounded-xl px-4 py-3 text-sm space-y-2">
            {hintLevel === 1 && sq?.translation && (
              <>
                <p className="text-gray-500 text-xs uppercase tracking-wide">Term</p>
                <p className="text-white font-medium">{extractWordHint(sq.translation)}</p>
              </>
            )}
            {hintLevel === 2 && sq?.translation && (
              <>
                <p className="text-gray-500 text-xs uppercase tracking-wide">Translation</p>
                <p className="text-gray-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: sq.translation }} />
              </>
            )}
            {hintLevel === 3 && sq?.nuance && (
              <>
                <p className="text-gray-500 text-xs uppercase tracking-wide">Explanation</p>
                <p className="text-gray-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: sq.nuance }} />
              </>
            )}
            {hintLevel === 4 && sq?.nuance_translation && (
              <>
                <p className="text-gray-500 text-xs uppercase tracking-wide">Explanation (EN)</p>
                <p className="text-gray-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: sq.nuance_translation }} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
