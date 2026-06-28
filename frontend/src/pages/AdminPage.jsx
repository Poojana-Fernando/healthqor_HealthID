import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, Stethoscope, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AdminDashboard from '../components/admin/AdminDashboard'
import AdminDoctors from '../components/admin/AdminDoctors'
import AdminPatients from '../components/admin/AdminPatients'

const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'doctors', label: 'Doctors', icon: Stethoscope },
  { id: 'patients', label: 'Patients', icon: Users },
]

export default function AdminPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState('dashboard')

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
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-colors ${
                  section === id
                    ? 'bg-accent/20 text-accent border border-accent/30'
                    : 'text-white/60 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1 min-w-0">
          {section === 'dashboard' && <AdminDashboard />}
          {section === 'doctors' && <AdminDoctors />}
          {section === 'patients' && <AdminPatients />}
        </div>
      </div>
    </main>
  )
}
