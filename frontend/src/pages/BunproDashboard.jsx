import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_BASE_URL

export default function BunproDashboard() {
  const navigate = useNavigate()
  const [reviewCount, setReviewCount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  function loadData() {
    setLoading(true)
    setError(null)
    fetch(`${API}/api/bunpro/due`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => {
        setReviewCount((d?.total_due_grammar ?? 0) + (d?.total_due_vocab ?? 0))
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => { loadData() }, [])

  return (
    <div
      className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-300 text-sm mb-6 flex items-center gap-1 mx-auto transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">Bunpro</h1>
          <p className="text-gray-400 text-lg">Grammar & Vocabulary</p>
        </div>

        {loading && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400">Loading...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-xl p-4 text-center">
            <p className="text-red-300 font-medium">Failed to load</p>
            <p className="text-red-400 text-sm mt-1">{error}</p>
            <button
              onClick={loadData}
              className="mt-3 px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-sm font-medium transition-colors text-white"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-gray-400 text-sm font-medium uppercase tracking-wide">Reviews</p>
                  <p className="text-5xl font-bold text-white mt-1">
                    {reviewCount !== null ? reviewCount : '—'}
                  </p>
                </div>
                <div className="w-16 h-16 bg-teal-600/20 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <button
                onClick={() => navigate('/bunpro/reviews')}
                disabled={reviewCount === 0}
                className={`w-full py-3 rounded-xl font-semibold text-lg transition-all ${
                  reviewCount !== 0
                    ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-900/30 active:scale-95'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {reviewCount === 0 ? 'No Reviews Available' : 'Start Reviews'}
              </button>
            </div>

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
