import { useEffect, useState } from 'react'

let nextId = 0

export default function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    function handler(e) {
      const { message, type } = e.detail
      const id = ++nextId
      setToasts(prev => [...prev, { id, message, type }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
    }
    window.addEventListener('app-toast', handler)
    return () => window.removeEventListener('app-toast', handler)
  }, [])

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center w-full max-w-sm px-4">
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
          className={`w-full px-4 py-3 rounded-xl text-sm font-medium shadow-lg cursor-pointer transition-all ${
            t.type === 'error'
              ? 'bg-red-900 border border-red-700 text-red-200'
              : t.type === 'success'
              ? 'bg-green-900 border border-green-700 text-green-200'
              : 'bg-gray-800 border border-gray-600 text-gray-200'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
