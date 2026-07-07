import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { translations } from '../data/homepageContent'
import { LANG_KEY } from '../utils/homepageStorage'

const LanguageContext = createContext(null)

function readStoredLanguage() {
  try {
    const stored = localStorage.getItem(LANG_KEY)
    return stored === 'si' ? 'si' : 'en'
  } catch {
    return 'en'
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(readStoredLanguage)

  const setLanguage = useCallback((lang) => {
    const next = lang === 'si' ? 'si' : 'en'
    setLanguageState(next)
    try {
      localStorage.setItem(LANG_KEY, next)
    } catch {
      // ignore
    }
  }, [])

  const t = useCallback(
    (key) => translations[language]?.[key] ?? translations.en[key] ?? key,
    [language]
  )

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    return {
      language: 'en',
      setLanguage: () => {},
      t: (key) => translations.en[key] ?? key,
    }
  }
  return ctx
}
