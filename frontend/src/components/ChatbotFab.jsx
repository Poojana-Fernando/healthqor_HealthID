import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

const WELCOME = "Hello! I'm your Health ID medical assistant. Ask me about human health, wellness, or how to use this app. I only answer health-related questions for people."

export default function ChatbotFab() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([{ role: 'assistant', content: WELCOME }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading, open])

  const sendMessage = async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setError('')
    setInput('')
    const userMsg = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }))

      const res = await api.chatAssistant(text, history)
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }])
    } catch (err) {
      setError(err.message || 'Failed to get a response')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-6 w-[22rem] sm:w-96 premium-glass rounded-2xl z-50 shadow-glass-glow-lg flex flex-col max-h-[32rem] overflow-hidden">
          <div className="flex justify-between items-center px-4 py-3 border-b border-white/10">
            <div>
              <span className="font-semibold text-accent2 text-sm">Medical Assistant</span>
              <p className="text-[10px] opacity-50">Human health &amp; app help only</p>
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
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[12rem]">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
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
                  <div className="flex justify-start">
                    <div className="bg-white/10 rounded-2xl px-3 py-2 text-sm opacity-60 animate-pulse">
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
                  placeholder="Ask a health question..."
                  disabled={loading}
                  className="flex-1 bg-navy/40 border border-white/15 rounded-xl px-3 py-2 text-sm placeholder:opacity-40 focus:outline-none focus:border-accent/50"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="bg-accent hover:bg-accent2 disabled:opacity-40 px-4 py-2 rounded-xl text-sm font-medium transition"
                >
                  Send
                </button>
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
