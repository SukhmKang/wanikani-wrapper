import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_BASE_URL

function AppCard({ title, subtitle, reviewCount, lessonCount, accentClass, buttonClass, shadowClass, iconClass, onClick }) {
  return (
    <div className="bg-gray-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-white font-bold text-2xl">{title}</p>
          <p className="text-gray-400 text-sm mt-0.5">{subtitle}</p>
        </div>
        <div className={`w-14 h-14 ${iconClass} rounded-2xl flex items-center justify-center`}>
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
      </div>

      <div className="flex gap-4 mb-5">
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide">Reviews</p>
          <p className="text-3xl font-bold text-white">
            {reviewCount === null ? <span className="text-gray-600">—</span> : reviewCount}
          </p>
        </div>
        {lessonCount !== undefined && (
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Lessons</p>
            <p className="text-3xl font-bold text-white">
              {lessonCount === null ? <span className="text-gray-600">—</span> : lessonCount}
            </p>
          </div>
        )}
      </div>

      <button
        onClick={onClick}
        className={`w-full py-3 rounded-xl font-semibold text-lg text-white transition-all active:scale-95 shadow-lg ${buttonClass} ${shadowClass}`}
      >
        Open {title}
      </button>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const [wkReviews, setWkReviews] = useState(null)
  const [wkLessons, setWkLessons] = useState(null)
  const [bpReviews, setBpReviews] = useState(null)

  useEffect(() => {
    fetch(`${API}/api/summary`)
      .then(r => r.json())
      .then(d => {
        setWkReviews(d.reviews?.length ?? 0)
        setWkLessons(d.lessons?.length ?? 0)
      })
      .catch(() => {
        setWkReviews(0)
        setWkLessons(0)
      })

    fetch(`${API}/api/bunpro/due`)
      .then(r => r.json())
      .then(d => {
        setBpReviews((d?.total_due_grammar ?? 0) + (d?.total_due_vocab ?? 0))
      })
      .catch(() => setBpReviews(null))
  }, [])

  return (
    <div
      className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">日本語</h1>
          <p className="text-gray-400">Choose your practice</p>
        </div>

        <div className="space-y-4">
          <AppCard
            title="WaniKani"
            subtitle="Kanji & Vocabulary"
            reviewCount={wkReviews}
            lessonCount={wkLessons}
            iconClass="bg-pink-600/20 text-pink-400"
            buttonClass="bg-pink-600 hover:bg-pink-500"
            shadowClass="shadow-pink-900/30"
            onClick={() => navigate('/wanikani')}
          />
          <AppCard
            title="Bunpro"
            subtitle="Grammar & Vocabulary"
            reviewCount={bpReviews}
            iconClass="bg-teal-600/20 text-teal-400"
            buttonClass="bg-teal-600 hover:bg-teal-500"
            shadowClass="shadow-teal-900/30"
            onClick={() => navigate('/bunpro')}
          />
        </div>
      </div>
    </div>
  )
}
