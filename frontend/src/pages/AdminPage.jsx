import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

function Pagination({ page, totalPages, totalElements, onPageChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <p className="opacity-60">
        Page {page + 1} of {totalPages} ({totalElements} total)
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
          className="px-3 py-1 rounded border border-border disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
          className="px-3 py-1 rounded border border-border disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState({ content: [], totalPages: 0, number: 0, totalElements: 0 })
  const [usersPage, setUsersPage] = useState(0)
  const [search, setSearch] = useState('')
  const [lookupId, setLookupId] = useState('')
  const [lookupResult, setLookupResult] = useState(null)
  const [auditLogs, setAuditLogs] = useState({ content: [], totalPages: 0, number: 0, totalElements: 0 })
  const [auditPage, setAuditPage] = useState(0)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) navigate('/')
  }, [user, loading, navigate])

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      api.adminStats().then(setStats).catch(() => {})
    }
  }, [user])

  const loadUsers = (page = usersPage, q = search) => {
    api.adminUsers(q, page).then(setUsers).catch(() => {})
  }

  const loadAuditLogs = (page = auditPage) => {
    api.adminAuditLogs(page).then(setAuditLogs).catch(() => {})
  }

  useEffect(() => {
    if (user?.role === 'ADMIN' && tab === 'users') loadUsers(usersPage)
  }, [user, tab, usersPage])

  useEffect(() => {
    if (user?.role === 'ADMIN' && tab === 'audit') loadAuditLogs(auditPage)
  }, [user, tab, auditPage])

  const doLookup = async () => {
    try {
      const res = await api.adminLookup(lookupId)
      setLookupResult(res)
    } catch {
      setLookupResult({ error: 'Not found' })
    }
  }

  if (loading || user?.role !== 'ADMIN') {
    return <div className="flex items-center justify-center min-h-[60vh] opacity-60">Access denied</div>
  }

  const userRows = users.content || []

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>

      {stats && (
        <div className="grid sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Users', value: stats.totalUsers },
            { label: 'Doctors', value: stats.totalDoctors },
            { label: 'Appointments Today', value: stats.appointmentsToday },
            { label: 'Audit Logs', value: stats.totalAuditLogs },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-accent">{s.value}</p>
              <p className="text-xs opacity-60">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-6 border-b border-border">
        {['users', 'lookup', 'audit'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize border-b-2 ${
              tab === t ? 'border-accent text-accent2' : 'border-transparent opacity-60'
            }`}
          >
            {t === 'audit' ? 'Audit Logs' : t === 'lookup' ? 'Health ID Lookup' : 'User Management'}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div>
          <div className="flex gap-3 mb-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="flex-1 bg-navy/50 border border-border rounded-lg px-3 py-2"
            />
            <button
              type="button"
              onClick={() => {
                setUsersPage(0)
                loadUsers(0)
              }}
              className="bg-accent px-4 rounded-lg"
            >
              Search
            </button>
          </div>
          <div className="glass rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left opacity-60">
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Health ID</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Verified</th>
                </tr>
              </thead>
              <tbody>
                {userRows.map((u) => (
                  <tr key={u.id} className="border-b border-border/50">
                    <td className="p-3">{u.name}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3 font-mono text-xs">{u.healthId}</td>
                    <td className="p-3">{u.role}</td>
                    <td className="p-3">{u.verified ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={users.number ?? usersPage}
            totalPages={users.totalPages ?? 1}
            totalElements={users.totalElements ?? userRows.length}
            onPageChange={setUsersPage}
          />
        </div>
      )}

      {tab === 'lookup' && (
        <div className="glass rounded-xl p-6 max-w-lg">
          <label className="text-xs text-accent2 block mb-2">Health ID or Email</label>
          <div className="flex gap-3">
            <input
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              className="flex-1 bg-navy/50 border border-border rounded-lg px-3 py-2"
            />
            <button onClick={doLookup} className="bg-accent px-4 rounded-lg">Lookup</button>
          </div>
          {lookupResult && !lookupResult.error && (
            <div className="mt-4 space-y-2 text-sm">
              <p><span className="opacity-60">Name:</span> {lookupResult.name}</p>
              <p><span className="opacity-60">Health ID:</span> {lookupResult.healthId}</p>
              <p><span className="opacity-60">Role:</span> {lookupResult.role}</p>
            </div>
          )}
          {lookupResult?.error && <p className="mt-4 text-red-400">{lookupResult.error}</p>}
        </div>
      )}

      {tab === 'audit' && (
        <div>
          <div className="glass rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left opacity-60">
                  <th className="p-3">Time</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity</th>
                  <th className="p-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {(auditLogs.content || []).map((log) => (
                  <tr key={log.id} className="border-b border-border/50">
                    <td className="p-3 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-3">{log.action}</td>
                    <td className="p-3">{log.entityType} {log.entityId}</td>
                    <td className="p-3 text-xs opacity-60">{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={auditLogs.number ?? auditPage}
            totalPages={auditLogs.totalPages ?? 1}
            totalElements={auditLogs.totalElements ?? (auditLogs.content || []).length}
            onPageChange={setAuditPage}
          />
        </div>
      )}
    </main>
  )
}
