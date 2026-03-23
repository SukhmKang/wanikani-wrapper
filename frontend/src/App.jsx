import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Dashboard from './pages/Dashboard.jsx'
import QuizPage from './pages/QuizPage.jsx'
import BunproDashboard from './pages/BunproDashboard.jsx'
import BunproQuizPage from './pages/BunproQuizPage.jsx'
import ToastContainer from './components/ToastContainer.jsx'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/wanikani" element={<Dashboard />} />
        <Route path="/wanikani/reviews" element={<QuizPage mode="reviews" />} />
        <Route path="/wanikani/lessons" element={<QuizPage mode="lessons" />} />
        <Route path="/bunpro" element={<BunproDashboard />} />
        <Route path="/bunpro/reviews" element={<BunproQuizPage />} />
      </Routes>
      <ToastContainer />
    </>
  )
}
