import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import AnimatedLogo from './AnimatedLogo'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { language, setLanguage } = useLanguage()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <nav className="sticky top-0 z-50 bg-[#0c1a14]/15 backdrop-blur-sm border-b border-white/15 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <AnimatedLogo size={40} />
          <span className="font-bold text-lg tracking-wide">Health ID</span>
          <span className="text-xs bg-emerald-500/15 text-accent2 px-2 py-0.5 rounded-full border border-emerald-400/30">
            1990
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm">
          <Link to="/" className="hover:text-accent2 transition">Home</Link>
          <Link to="/find-care" className="hover:text-accent2 transition">Find Care</Link>
          <a href="/echanneling" className="hover:text-accent2 transition">
            e-Channeling
          </a>
          <Link to="/support" className="hover:text-accent2 transition">Support</Link>
          <Link to="/doctor/login" className="hover:text-accent2 transition">Doctor Login</Link>
          {user?.role === 'DOCTOR' && (
            <Link to="/doctor" className="hover:text-accent2 transition text-accent">Doctor Portal</Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link to="/admin" className="hover:text-accent2 transition text-accent">Admin</Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 text-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 transition ${language === 'en' ? 'bg-emerald-500/25 text-accent2 font-semibold' : 'opacity-60 hover:opacity-100'}`}
              aria-label="English"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('si')}
              className={`px-2.5 py-1 transition ${language === 'si' ? 'bg-emerald-500/25 text-accent2 font-semibold' : 'opacity-60 hover:opacity-100'}`}
              aria-label="Sinhala"
            >
              සිංහල
            </button>
          </div>
          {user ? (
            <>
              <Link to="/profile" className="flex items-center gap-2 glass px-3 py-1.5 rounded-full hover:border-accent/50 transition">
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm font-bold">
                    {user.name?.[0]}
                  </div>
                )}
                <span className="text-sm hidden sm:inline">{user.name}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm px-4 py-2 rounded-lg border border-border hover:border-accent hover:text-accent2 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm px-4 py-2 rounded-lg border border-border hover:border-accent transition">
                Login
              </Link>
              <Link to="/signup" className="text-sm px-4 py-2 rounded-lg bg-accent hover:bg-accent2 text-white transition">
                Signup
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
