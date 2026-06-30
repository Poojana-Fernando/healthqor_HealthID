import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { api } from '../../api/client'
import { Button } from '../ui/Button'

export default function DoctorDashboard() {
  const [stats, setStats] = useState(null)
  const [appointments, setAppointments] = useState({ content: [] })
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const [s, appts] = await Promise.all([
        api.doctorStats(),
        api.doctorAppointments({
          from: today.toISOString(),
          to: tomorrow.toISOString(),
        }),
      ])
      setStats(s)
      setAppointments(appts)
    } catch {
      setStats(null)
      setAppointments({ content: [] })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggleAvailability = async () => {
    if (!stats) return
    setToggling(true)
    try {
      await api.doctorSetAvailability({ available: !stats.available })
      load()
    } catch (err) {
      alert(err.message)
    } finally {
      setToggling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-white/50">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {!stats?.verifiedByAdmin && (
        <div className="glass rounded-xl p-4 border border-yellow-500/30 text-yellow-400 text-sm">
          Your account is pending admin verification. You can manage your schedule, but patients cannot book until verified.
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-white/50">Pending today</p>
          <p className="text-2xl font-bold text-accent">{stats?.pendingToday ?? 0}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-white/50">Confirmed today</p>
          <p className="text-2xl font-bold">{stats?.confirmedToday ?? 0}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-white/50">Completed today</p>
          <p className="text-2xl font-bold text-green-400">{stats?.completedToday ?? 0}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-white/50">Total pending</p>
          <p className="text-2xl font-bold">{stats?.totalPending ?? 0}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <p className="text-sm text-white/50">Accepting new bookings</p>
          <p className={`font-semibold ${stats?.available ? 'text-green-400' : 'text-red-400'}`}>
            {stats?.available ? 'Available' : 'Unavailable'}
          </p>
        </div>
        <Button type="button" variant="outline" disabled={toggling} onClick={toggleAvailability}>
          {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : stats?.available ? 'Pause bookings' : 'Resume bookings'}
        </Button>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Today&apos;s queue</h2>
          <Link to="/doctor/appointments" className="text-sm text-accent2 hover:text-accent">
            View all
          </Link>
        </div>
        <div className="space-y-2">
          {(appointments.content || []).length === 0 ? (
            <p className="text-white/50 text-sm">No appointments scheduled for today.</p>
          ) : (
            (appointments.content || []).map((a) => (
              <div key={a.id} className="glass rounded-lg p-4 flex justify-between items-center gap-4">
                <div>
                  <p className="font-medium">{a.patientName}</p>
                  <p className="text-xs text-white/50 font-mono">{a.patientHealthId}</p>
                  <p className="text-sm opacity-70 mt-1">{new Date(a.scheduledAt).toLocaleString()}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  a.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400'
                    : a.status === 'CONFIRMED' ? 'bg-accent/20 text-accent'
                    : a.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {a.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
