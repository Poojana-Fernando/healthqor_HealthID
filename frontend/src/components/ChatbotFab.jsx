import { useState } from 'react'

export default function ChatbotFab() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-6 w-80 glass rounded-2xl p-4 z-50 shadow-2xl">
          <div className="flex justify-between items-center mb-3">
            <span className="font-semibold text-accent2">AI Health Assistant</span>
            <button onClick={() => setOpen(false)} className="opacity-60 hover:opacity-100">✕</button>
          </div>
          <p className="text-sm opacity-70">
            Hi! I can help with symptom checking and health guidance. Use the Symptom Checker on the homepage or visit your profile for a full AI analysis.
          </p>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-accent hover:bg-accent2 shadow-lg flex items-center justify-center text-2xl z-50 transition"
        aria-label="AI Chatbot"
      >
        🤖
      </button>
    </>
  )
}
