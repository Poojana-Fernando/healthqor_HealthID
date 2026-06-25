import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getGitHubRedirectUri } from '../utils/githubAuth'

export default function GitHubCallbackPage() {
  const { githubLogin } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const oauthError = params.get('error')
    const oauthDescription = params.get('error_description')

    if (oauthError) {
      setError(`GitHub sign-in was cancelled or denied${oauthDescription ? `: ${oauthDescription}` : ` (${oauthError})`}.`)
      return
    }

    if (!code) {
      setError('Missing authorization code from GitHub.')
      return
    }

    window.history.replaceState({}, '', window.location.pathname)

    githubLogin(code, getGitHubRedirectUri())
      .then(() => navigate('/profile', { replace: true }))
      .catch((e) => setError(e.message))
  }, [githubLogin, navigate])

  if (error) {
    return (
      <main className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">GitHub sign-in failed</h1>
        <p className="text-red-400 text-sm mb-6">{error}</p>
        <button
          onClick={() => navigate('/login', { replace: true })}
          className="bg-accent hover:bg-accent2 px-6 py-2 rounded-xl"
        >
          Back to login
        </button>
      </main>
    )
  }

  return (
    <main className="max-w-md mx-auto px-4 py-16 text-center">
      <p className="opacity-70">Completing GitHub sign-in...</p>
    </main>
  )
}
