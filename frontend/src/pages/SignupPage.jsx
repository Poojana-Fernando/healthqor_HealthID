import { useState } from 'react'
import { Link } from 'react-router-dom'
import AnimatedLogo from '../components/AnimatedLogo'
import SignupMultistepForm from '../components/signup/SignupMultistepForm'
import { startGoogleOAuth } from '../utils/googleAuth'

export default function SignupPage() {
  const [error, setError] = useState('')

  const handleGoogle = () => {
    setError('')
    try {
      startGoogleOAuth()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-12">
      <div className="flex flex-col items-center mb-8">
        <AnimatedLogo size={56} />
        <h1 className="text-3xl font-bold mt-4 mb-2 text-center">Create Your Health ID</h1>
        <p className="opacity-60 text-center text-sm">
          Register to get your unique digital health identity
        </p>
      </div>

      <SignupMultistepForm onError={setError} />

      {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}

      <div className="flex items-center gap-4 my-8">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs opacity-50">or continue with</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        className="w-full glass flex items-center justify-center gap-3 py-3 rounded-xl hover:border-accent transition"
      >
        <span className="text-xl font-semibold">G</span>
        Continue with Google
      </button>

      <p className="text-center text-sm opacity-60 mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-accent2 hover:text-accent transition">
          Login
        </Link>
      </p>
    </main>
  )
}
