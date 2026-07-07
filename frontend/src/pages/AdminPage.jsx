import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Stethoscope, Users, MessageSquare } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const SECTIONS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/doctors', label: 'Doctors', icon: Stethoscope, end: false },
  { to: '/admin/patients', label: 'Patients', icon: Users, end: false },
  { to: '/admin/support-tickets', label: 'Support Tickets', icon: MessageSquare, end: false },
]

export default function AdminPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) navigate('/')
  }, [user, loading, navigate])

  if (loading || user?.role !== 'ADMIN') {
    return <div className="flex items-center justify-center min-h-[60vh] opacity-60">Access denied</div>
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-white/50 text-sm mt-1">Manage doctors, patients, and system operations</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-56 shrink-0">
          <nav className="flex lg:flex-col gap-2">
            {SECTIONS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-colors border ${
                    isActive
                      ? 'bg-accent/20 text-accent border-accent/30'
                      : 'text-white/60 hover:bg-white/5 border-transparent'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </main>
  )
}
