import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import QuizPage from './pages/QuizPage.jsx'
import ToastContainer from './components/ToastContainer.jsx'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/reviews" element={<QuizPage mode="reviews" />} />
        <Route path="/lessons" element={<QuizPage mode="lessons" />} />
      </Routes>
      <ToastContainer />
    </>
  )
}
