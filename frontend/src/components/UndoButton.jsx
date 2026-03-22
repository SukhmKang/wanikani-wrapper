import React from 'react'

export default function UndoButton({ onUndo, disabled }) {
  return (
    <button
      onClick={onUndo}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        disabled
          ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
          : 'bg-gray-700 hover:bg-gray-600 text-gray-200 active:scale-95'
      }`}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
      Undo
    </button>
  )
}
