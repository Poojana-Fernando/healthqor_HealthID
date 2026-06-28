import { useEffect, useState } from 'react'
import { api } from '../../api/client'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [auditLogs, setAuditLogs] = useState({ content: [] })

  useEffect(() => {
    api.adminStats().then(setStats).catch(() => {})
    api.adminAuditLogs(0).then(setAuditLogs).catch(() => {})
  }, [])

  if (!stats) {
    return <div className="text-white/50 py-8">Loading dashboard...</div>
  }

  const cards = [
    { label: 'Total Patients', value: stats.totalPatients },
    { label: 'Total Doctors', value: stats.totalDoctors },
    { label: 'Appointments Today', value: stats.appointmentsToday },
    { label: 'Pending Verifications', value: stats.pendingDoctorVerifications },
    { label: 'Cancelled Today', value: stats.cancelledToday },
    { label: 'Audit Logs', value: stats.totalAuditLogs },
  ]

  return (
    <div className="space-y-8">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((s) => (
          <div key={s.label} className="glass rounded-xl p-5">
            <p className="text-2xl font-bold text-accent">{s.value}</p>
            <p className="text-xs opacity-60 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-semibold">Recent audit events</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left opacity-60">
              <th className="p-3">Time</th>
              <th className="p-3">Action</th>
              <th className="p-3">Entity</th>
            </tr>
          </thead>
          <tbody>
            {(auditLogs.content || []).slice(0, 10).map((log) => (
              <tr key={log.id} className="border-b border-border/50">
                <td className="p-3 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="p-3">{log.action}</td>
                <td className="p-3 text-xs opacity-70">{log.entityType} {log.entityId?.slice(0, 8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
