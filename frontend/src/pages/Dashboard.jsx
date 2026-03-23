import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_BASE_URL

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = d - now
  if (diffMs <= 0) return 'now'
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''}`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays !== 1 ? 's' : ''}`
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [level, setLevel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  function loadData() {
    setLoading(true)
    setError(null)
    Promise.all([
      fetch(`${API}/api/summary`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
      fetch(`${API}/api/level`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
    ])
      .then(([summaryData, levelData]) => {
        setSummary(summaryData)
        setLevel(levelData)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => { loadData() }, [])

  const reviewCount = summary?.reviews?.length ?? 0
  const lessonCount = summary?.lessons?.length ?? 0
  const nextReviews = summary?.next_reviews_at

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">WaniKani</h1>
          <div className="flex items-center justify-center gap-3 mt-2">
            <p className="text-gray-400 text-lg">Personal Review Client</p>
            {level && (
              <span className="px-3 py-1 bg-pink-600 text-white text-sm font-bold rounded-full">
                Level {level.level}
              </span>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400">Loading summary...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-xl p-4 text-center">
            <p className="text-red-300 font-medium">Failed to load summary</p>
            <p className="text-red-400 text-sm mt-1">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-sm font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && summary && (
          <div className="space-y-4">
            {/* Reviews card */}
            <div className="bg-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-gray-400 text-sm font-medium uppercase tracking-wide">Reviews</p>
                  <p className="text-5xl font-bold text-white mt-1">{reviewCount}</p>
                  {reviewCount === 0 && nextReviews && (
                    <p className="text-gray-400 text-sm mt-2">
                      Next in {formatDate(nextReviews)}
                    </p>
                  )}
                </div>
                <div className="w-16 h-16 bg-pink-600/20 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <button
                onClick={() => navigate('/reviews')}
                disabled={reviewCount === 0}
                className={`w-full py-3 rounded-xl font-semibold text-lg transition-all ${
                  reviewCount > 0
                    ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-900/30 active:scale-95'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {reviewCount > 0 ? 'Start Reviews' : 'No Reviews Available'}
              </button>
            </div>

            {/* Lessons card */}
            <div className="bg-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-gray-400 text-sm font-medium uppercase tracking-wide">Lessons</p>
                  <p className="text-5xl font-bold text-white mt-1">{lessonCount}</p>
                </div>
                <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
              <button
                onClick={() => navigate('/lessons')}
                disabled={lessonCount === 0}
                className={`w-full py-3 rounded-xl font-semibold text-lg transition-all ${
                  lessonCount > 0
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30 active:scale-95'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {lessonCount > 0 ? 'Start Lessons' : 'No Lessons Available'}
              </button>
            </div>

            {/* Refresh button */}
            <button
              onClick={loadData}
              className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
