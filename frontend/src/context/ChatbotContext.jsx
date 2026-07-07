import { createContext, useContext, useState, useCallback, useMemo } from 'react'

const ChatbotContext = createContext(null)

export function ChatbotProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)

  const openChat = useCallback(() => setIsOpen(true), [])
  const closeChat = useCallback(() => setIsOpen(false), [])
  const toggleChat = useCallback(() => setIsOpen((o) => !o), [])

  const value = useMemo(
    () => ({ isOpen, setIsOpen, openChat, closeChat, toggleChat }),
    [isOpen, openChat, closeChat, toggleChat]
  )

  return <ChatbotContext.Provider value={value}>{children}</ChatbotContext.Provider>
}

export function useChatbot() {
  const ctx = useContext(ChatbotContext)
  if (!ctx) {
    return {
      isOpen: false,
      setIsOpen: () => {},
      openChat: () => window.dispatchEvent(new Event('hq-open-chatbot')),
      closeChat: () => {},
      toggleChat: () => {},
    }
  }
  return ctx
}
