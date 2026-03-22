import React, { useState, useRef } from 'react'
import { renderMarkup } from '../utils/markup.jsx'

const API = import.meta.env.VITE_API_BASE_URL

export default function MnemonicPanel({ item, questionType, audioEnabled = true, onStudyMaterialUpdate }) {
  const [showSynonymInput, setShowSynonymInput] = useState(false)
  const [synonymValue, setSynonymValue] = useState('')
  const [synonymLoading, setSynonymLoading] = useState(false)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const audioRef = useRef(null)

  const studyMaterial = item.study_material
  const isVocab = item.subject_type === 'vocabulary' || item.subject_type === 'kana_vocabulary'
  const hasAudio = audioEnabled && isVocab && item.pronunciation_audios && item.pronunciation_audios.length > 0

  async function handleAddSynonym() {
    const value = synonymValue.trim()
    if (!value) return
    setSynonymLoading(true)

    try {
      const currentSynonyms = studyMaterial?.meaning_synonyms || []
      const newSynonyms = [...currentSynonyms, value]

      if (studyMaterial?.id) {
        const res = await fetch(`${API}/api/study_materials/${studyMaterial.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meaning_synonyms: newSynonyms })
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const updated = await res.json()
        onStudyMaterialUpdate({
          ...studyMaterial,
          meaning_synonyms: newSynonyms,
          ...updated.data
        })
      } else {
        const res = await fetch(`${API}/api/study_materials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject_id: item.subject_id,
            meaning_synonyms: newSynonyms
          })
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const created = await res.json()
        onStudyMaterialUpdate({
          id: created.data?.id,
          meaning_note: '',
          reading_note: '',
          meaning_synonyms: newSynonyms,
          ...created.data
        })
      }

      setSynonymValue('')
      setShowSynonymInput(false)
    } catch (err) {
      console.error('Failed to save synonym:', err)
    } finally {
      setSynonymLoading(false)
    }
  }

  function playAudio() {
    if (!hasAudio || audioPlaying) return
    const audio = item.pronunciation_audios[0]
    if (audioRef.current) {
      audioRef.current.pause()
    }
    const el = new Audio(audio.url)
    audioRef.current = el
    setAudioPlaying(true)
    el.play()
    el.onended = () => setAudioPlaying(false)
    el.onerror = () => setAudioPlaying(false)
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4 space-y-4 text-sm">
      {/* WaniKani meaning mnemonic */}
      {item.meaning_mnemonic && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Meaning Mnemonic</p>
          <p className="text-gray-200 leading-relaxed">
            {renderMarkup(item.meaning_mnemonic)}
          </p>
        </div>
      )}

      {/* Per-kanji mnemonics from kanji_mnemonics.json */}
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

      {/* WaniKani reading mnemonic (reading questions only) */}
      {questionType === 'reading' && item.reading_mnemonic && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Reading Mnemonic</p>
          <p className="text-gray-200 leading-relaxed">
            {renderMarkup(item.reading_mnemonic)}
          </p>
        </div>
      )}

      {/* User notes from study material */}
      {studyMaterial?.meaning_note && (
        <div>
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">Your Meaning Note</p>
          <p className="text-gray-200 leading-relaxed">{studyMaterial.meaning_note}</p>
        </div>
      )}
      {studyMaterial?.reading_note && questionType === 'reading' && (
        <div>
          <p className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-1">Your Reading Note</p>
          <p className="text-gray-200 leading-relaxed">{studyMaterial.reading_note}</p>
        </div>
      )}

      {/* Synonyms list */}
      {studyMaterial?.meaning_synonyms?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wide mb-1">Your Synonyms</p>
          <div className="flex flex-wrap gap-1.5">
            {studyMaterial.meaning_synonyms.map((syn, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-yellow-900/40 border border-yellow-700/50 rounded text-yellow-200 text-xs"
              >
                {syn}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bottom row: audio + add synonym */}
      <div className="flex items-center gap-2 pt-1">
        {hasAudio && (
          <button
            onClick={playAudio}
            disabled={audioPlaying}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              audioPlaying
                ? 'bg-blue-900/50 text-blue-400 cursor-not-allowed'
                : 'bg-blue-700/40 hover:bg-blue-600/50 text-blue-300 active:scale-95'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072" />
            </svg>
            {audioPlaying ? 'Playing...' : 'Play Audio'}
          </button>
        )}

        {!showSynonymInput ? (
          <button
            onClick={() => setShowSynonymInput(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 hover:bg-gray-600 text-gray-300 transition-all active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Synonym
          </button>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={synonymValue}
              onChange={e => setSynonymValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddSynonym()
                if (e.key === 'Escape') { setShowSynonymInput(false); setSynonymValue('') }
              }}
              placeholder="Enter synonym..."
              autoFocus
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
            />
            <button
              onClick={handleAddSynonym}
              disabled={synonymLoading || !synonymValue.trim()}
              className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:text-gray-400 rounded-lg text-xs font-medium text-white transition-all"
            >
              {synonymLoading ? '...' : 'Add'}
            </button>
            <button
              onClick={() => { setShowSynonymInput(false); setSynonymValue('') }}
              className="px-2 py-1.5 text-gray-400 hover:text-gray-200 text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
