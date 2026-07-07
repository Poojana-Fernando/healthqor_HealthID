import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import LoadingButton from './ui/LoadingButton'
import HealthIdLoadingIcon from './ui/HealthIdLoadingIcon'

const WELCOME = "Hello! I'm your Health ID assistant. I can answer wellness questions and help you use this app — Profile, Find Care, e-Channeling, symptom checker, and support. I give general guidance only, not a medical diagnosis."

function buildHistory(messages, userMsg) {
  return [...messages, userMsg]
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content?.trim())
    .filter((m) => m.content !== WELCOME)
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.trim() }))
}

export default function ChatbotFab() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([{ role: 'assistant', content: WELCOME }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    setMessages([{ role: 'assistant', content: WELCOME }])
    setError('')
    setInput('')
  }, [user?.userId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading, open])

  useEffect(() => {
    if (open && user) {
      api.warmSession().catch(() => {})
    }
  }, [open, user])

  const sendMessage = useCallback(async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading || !user) return

    setError('')
    setInput('')
    const userMsg = { role: 'user', content: text }
    const historyForApi = buildHistory(messages, userMsg)

    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await api.chatAssistant(text, historyForApi)
      const reply = res?.reply?.trim()
      if (!reply) {
        throw new Error('The assistant returned an empty response. Please try again.')
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err.message || 'Failed to get a response')
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, user])

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-6 w-[22rem] sm:w-96 premium-glass rounded-2xl z-50 shadow-glass-glow-lg flex flex-col max-h-[32rem] overflow-hidden">
          <div className="flex justify-between items-center px-4 py-3 border-b border-white/10">
            <div>
              <span className="font-semibold text-accent2 text-sm">Medical Assistant</span>
              <p className="text-[10px] opacity-50">Wellness tips &amp; app navigation</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="opacity-60 hover:opacity-100 text-lg leading-none"
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          {!user ? (
            <div className="p-4 text-sm">
              <p className="opacity-70 mb-3">Please log in to chat with the medical assistant.</p>
              <Link to="/login" className="text-accent2 hover:underline">Go to Login</Link>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 space-y-3 min-h-[12rem] custom-scrollbar">
                {messages.map((msg, i) => (
                  <div
                    key={`${msg.role}-${i}-${msg.content.slice(0, 24)}`}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-accent/30 text-white rounded-br-sm'
                          : 'bg-white/10 text-white/90 rounded-bl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start items-center gap-2">
                    <HealthIdLoadingIcon size="xs" label="Thinking" />
                    <div className="bg-white/10 rounded-2xl px-3 py-2 text-sm opacity-60">
                      Thinking...
                    </div>
                  </div>
                )}
                {error && <p className="text-red-400 text-xs">{error}</p>}
              </div>

              <form onSubmit={sendMessage} className="p-3 border-t border-white/10 flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about health or the app..."
                  disabled={loading}
                  className="flex-1 bg-navy/40 border border-white/15 rounded-xl px-3 py-2 text-sm placeholder:opacity-40 focus:outline-none focus:border-accent/50"
                />
                <LoadingButton
                  type="submit"
                  disabled={!input.trim() || loading}
                  loading={loading}
                  loadingLabel="Sending..."
                  className="px-4 py-2 rounded-xl text-sm font-medium"
                >
                  Send
                </LoadingButton>
              </form>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-accent hover:bg-accent2 shadow-lg flex items-center justify-center text-2xl z-50 transition"
        aria-label="Open medical assistant chat"
      >
        {open ? '✕' : '🩺'}
      </button>
    </>
  )
}
