import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as wanakana from 'wanakana'

const API = import.meta.env.VITE_API_BASE_URL

const SRS_STAGES = {
  0: { label: 'Lesson', color: 'bg-gray-600' },
  1: { label: 'Apprentice 1', color: 'bg-pink-700' },
  2: { label: 'Apprentice 2', color: 'bg-pink-600' },
  3: { label: 'Apprentice 3', color: 'bg-pink-500' },
  4: { label: 'Apprentice 4', color: 'bg-pink-400' },
  5: { label: 'Guru 1', color: 'bg-purple-600' },
  6: { label: 'Guru 2', color: 'bg-purple-500' },
  7: { label: 'Master', color: 'bg-blue-600' },
  8: { label: 'Enlightened', color: 'bg-blue-400' },
  9: { label: 'Burned', color: 'bg-yellow-500' },
}

const SUBJECT_COLORS = {
  radical: 'bg-sky-500',
  kanji: 'bg-pink-600',
  vocabulary: 'bg-purple-600',
  kana_vocabulary: 'bg-purple-500',
}

export default function QuizCard({
  item,
  questionType,
  answerState,
  correctAnswer,
  onSubmit,
}) {
  const [inputValue, setInputValue] = useState('')
  const [transcribing, setTranscribing] = useState(false)
  const inputRef = useRef(null)
  const wanakanaRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const [recording, setRecording] = useState(false)
  const recordingRef = useRef(false)
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches

  // Keyboard shortcut: hold Ctrl+Space to record (works even when input is focused)
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

  // Auto-focus input when question changes
  useEffect(() => {
    setInputValue('')
    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
  }, [item?.subject_id, questionType])

  // Bind/unbind wanakana for reading questions
  useEffect(() => {
    const el = inputRef.current
    if (!el) return

    if (questionType === 'reading') {
      wanakana.bind(el, { IMEMode: true })
      wanakanaRef.current = el
    } else {
      if (wanakanaRef.current) {
        try { wanakana.unbind(wanakanaRef.current) } catch (e) {}
        wanakanaRef.current = null
      }
    }

    return () => {
      if (wanakanaRef.current) {
        try { wanakana.unbind(wanakanaRef.current) } catch (e) {}
        wanakanaRef.current = null
      }
    }
  }, [questionType, item?.subject_id])

  // Re-focus after answer state changes back to idle
  useEffect(() => {
    if (answerState === 'idle') {
      setInputValue('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [answerState])

  function handleSubmit(e) {
    e?.preventDefault()
    const val = questionType === 'reading' ? inputRef.current?.value || inputValue : inputValue
    if (!val.trim()) return
    onSubmit(val.trim())
  }

  async function handleMicStart() {
    if (transcribing) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      mr.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      mr.start()
      setRecording(true)
    } catch (err) {
      console.error('Microphone access denied:', err)
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

    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
    const formData = new FormData()
    formData.append('file', blob, 'recording.webm')
    formData.append('language', questionType === 'reading' ? 'ja' : 'en')

    try {
      const res = await fetch(`${API}/api/transcribe`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.transcript) {
        // Strip trailing punctuation (Whisper often appends a period)
        const text = data.transcript.replace(/[。．.、,，!！?？\s]+$/, '').trim()
        setInputValue(text)
        if (inputRef.current) {
          inputRef.current.value = text
          inputRef.current.dispatchEvent(new Event('input', { bubbles: true }))
        }
        inputRef.current?.focus()
      }
    } catch (err) {
      console.error('Transcription failed:', err)
    } finally {
      setTranscribing(false)
    }
  }

  const subjectColor = SUBJECT_COLORS[item.subject_type] || 'bg-gray-600'
  const srsInfo = SRS_STAGES[item.srs_stage] || { label: `Stage ${item.srs_stage}`, color: 'bg-gray-600' }
  const isAnswered = answerState !== 'idle'

  const cardBg = answerState === 'correct'
    ? 'bg-green-900/80 border-green-600'
    : answerState === 'incorrect' || answerState === 'blacklisted'
    ? 'bg-red-900/80 border-red-600'
    : answerState === 'wrong-check' || answerState === 'reading-in-meaning' || answerState === 'wrong-reading-type'
    ? 'bg-yellow-900/40 border-yellow-600'
    : answerState === 'checking'
    ? 'bg-gray-800 border-blue-600'
    : 'bg-gray-800 border-gray-700'

  return (
    <div className={`rounded-2xl border-2 transition-colors duration-300 overflow-hidden ${cardBg}`}>
      {/* Subject header */}
      <div className={`${subjectColor} px-6 py-5`}>
        <span className="text-white/80 text-sm font-medium capitalize">
          {item.subject_type.replace('_', ' ')}
        </span>
      </div>

      {/* Characters */}
      <div className="px-6 py-8 text-center">
        <p className="text-7xl font-bold text-white mb-2" style={{ fontFamily: '"Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", sans-serif' }}>
          {item.characters}
        </p>
        <div className="flex items-center justify-center gap-2 mt-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
            questionType === 'meaning'
              ? 'bg-gray-600 text-gray-100'
              : 'bg-gray-700 text-gray-100'
          }`}>
            {questionType === 'meaning' ? 'Meaning' : 'Reading'}
          </span>
        </div>
      </div>

      {/* Answer form */}
      <div className="px-6 pb-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={questionType === 'reading' ? undefined : inputValue}
              defaultValue={questionType === 'reading' ? '' : undefined}
              onChange={e => {
                if (questionType !== 'reading') setInputValue(e.target.value)
                else setInputValue(e.target.value)
              }}
              disabled={isAnswered}
              placeholder={questionType === 'meaning' ? 'Enter meaning...' : 'Enter reading...'}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              className={`w-full bg-gray-700 border rounded-xl px-4 py-3 text-white text-lg placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                answerState === 'correct'
                  ? 'border-green-500 focus:ring-green-500'
                  : answerState === 'incorrect'
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-600 focus:ring-pink-500 focus:border-pink-500'
              } ${isAnswered ? 'opacity-75 cursor-not-allowed' : ''}`}
            />
          </div>

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
              {correctAnswer && (
                <p className="text-gray-300 text-sm">
                  Correct answer: <span className="text-white font-medium">{correctAnswer}</span>
                </p>
              )}
            </div>
          )}
          {answerState === 'blacklisted' && (
            <div className="flex items-center gap-2 text-orange-400 font-medium text-sm">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              That answer is blacklisted
            </div>
          )}

          {/* Buttons row */}
          <div className="flex gap-2">
            {!isAnswered && (
              <>
                <button
                  type="submit"
                  className="flex-1 bg-pink-600 hover:bg-pink-500 text-white font-semibold py-2.5 rounded-xl transition-all active:scale-95 select-none"
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
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
