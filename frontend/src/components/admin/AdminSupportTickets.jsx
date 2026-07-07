import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import HealthIdLoadingIcon from '../ui/HealthIdLoadingIcon'
import { api } from '../../api/client'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import PaginationBar from '../ui/PaginationBar'

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
]

const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'General Inquiry', label: 'General Inquiry' },
  { value: 'Technical Issue', label: 'Technical Issue' },
  { value: 'Profile Verification', label: 'Profile Verification' },
  { value: 'e-Channeling Help', label: 'e-Channeling Help' },
  { value: 'Data Privacy & Security', label: 'Data Privacy & Security' },
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'All priorities' },
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Emergency', label: 'Emergency' },
]

function formatStatus(status) {
  return status?.replace(/_/g, ' ') || '—'
}

function priorityClass(priority) {
  if (priority === 'Emergency') return 'text-red-400'
  if (priority === 'High') return 'text-orange-400'
  return 'text-emerald-400'
}

export default function AdminSupportTickets() {
  const [tickets, setTickets] = useState({ content: [], totalPages: 0, totalElements: 0, number: 0 })
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [statusDraft, setStatusDraft] = useState('RECEIVED')
  const [savingStatus, setSavingStatus] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const loadTickets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.adminSupportTickets({
        search: search || undefined,
        status: status || undefined,
        category: category || undefined,
        priority: priority || undefined,
        page,
      })
      setTickets(res)
    } catch {
      setTickets({ content: [], totalPages: 0, totalElements: 0, number: 0 })
    } finally {
      setLoading(false)
    }
  }, [search, status, category, priority, page])

  useEffect(() => {
    setPage(0)
  }, [search, status, category, priority])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  const openDetail = async (ticket) => {
    try {
      const full = await api.adminSupportTicket(ticket.id)
      setSelected(full)
      setStatusDraft(full.status)
    } catch {
      setSelected(ticket)
      setStatusDraft(ticket.status)
    }
  }

  const saveStatus = async () => {
    if (!selected) return
    setSavingStatus(true)
    try {
      const updated = await api.adminUpdateSupportTicketStatus(selected.id, statusDraft)
      setSelected(updated)
      loadTickets()
    } catch (err) {
      alert(err.message || 'Failed to update status')
    } finally {
      setSavingStatus(false)
    }
  }

  const downloadAttachment = async () => {
    if (!selected?.hasAttachment) return
    setDownloading(true)
    try {
      const res = await fetch(api.adminSupportTicketAttachmentUrl(selected.id), {
        credentials: 'include',
      })
      if (!res.ok) {
        throw new Error('Download failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = selected.attachmentFileName || 'attachment'
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err.message || 'Could not download attachment')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Input
          placeholder="Search tickets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="xl:col-span-2"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value || 'all-status'} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value || 'all-category'} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
        <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value || 'all-priority'} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-white/50">
          <HealthIdLoadingIcon size="lg" label="Loading support tickets" />
        </div>
      ) : (
        <div className="glass rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-border text-left opacity-60">
                <th className="p-3">Ticket</th>
                <th className="p-3">Name</th>
                <th className="p-3">Subject</th>
                <th className="p-3">Category</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Status</th>
                <th className="p-3">Submitted</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(tickets.content || []).map((ticket) => (
                <tr key={ticket.id} className="border-b border-border/50 hover:bg-white/5">
                  <td className="p-3 font-mono text-xs">{ticket.ticketNumber}</td>
                  <td className="p-3">{ticket.name}</td>
                  <td className="p-3 max-w-[200px] truncate">{ticket.subject}</td>
                  <td className="p-3 text-xs">{ticket.category}</td>
                  <td className={`p-3 text-xs font-medium ${priorityClass(ticket.priority)}`}>{ticket.priority}</td>
                  <td className="p-3 text-xs">{formatStatus(ticket.status)}</td>
                  <td className="p-3 text-xs">
                    {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : '—'}
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      className="text-accent2 hover:text-accent text-xs"
                      onClick={() => openDetail(ticket)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(tickets.content || []).length === 0 && (
            <p className="p-6 text-center text-white/50 text-sm">No support tickets found.</p>
          )}
          <PaginationBar
            page={tickets.number ?? page}
            totalPages={tickets.totalPages ?? 0}
            totalElements={tickets.totalElements ?? 0}
            pageSize={tickets.size ?? PAGE_SIZE}
            onPageChange={setPage}
            disabled={loading}
          />
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-navy border-l border-border h-full overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold">{selected.subject}</h2>
                <p className="text-xs font-mono text-accent2 mt-1">{selected.ticketNumber}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)}><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-3 text-sm">
              <p><span className="opacity-60">Name:</span> {selected.name}</p>
              <p><span className="opacity-60">Email:</span> {selected.email}</p>
              <p><span className="opacity-60">Category:</span> {selected.category}</p>
              <p>
                <span className="opacity-60">Priority:</span>{' '}
                <span className={priorityClass(selected.priority)}>{selected.priority}</span>
              </p>
              <p><span className="opacity-60">Submitted:</span> {new Date(selected.createdAt).toLocaleString()}</p>
              {selected.userId && (
                <p><span className="opacity-60">User ID:</span> <span className="font-mono text-xs">{selected.userId}</span></p>
              )}
            </div>

            <div className="mt-6">
              <h3 className="font-semibold mb-2">Message</h3>
              <div className="glass rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed opacity-90">
                {selected.message}
              </div>
            </div>

            {selected.hasAttachment && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Attachment</h3>
                <div className="flex items-center justify-between gap-3 glass rounded-xl p-3">
                  <div className="text-sm truncate">
                    <p className="font-medium">{selected.attachmentFileName}</p>
                    <p className="text-xs opacity-60">{selected.attachmentContentType}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    disabled={downloading}
                    onClick={downloadAttachment}
                  >
                    {downloading ? <HealthIdLoadingIcon size="xs" label="Downloading" /> : 'Download'}
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-8 space-y-3">
              <h3 className="font-semibold">Update status</h3>
              <Select value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)}>
                {STATUS_OPTIONS.filter((opt) => opt.value).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
              <Button type="button" onClick={saveStatus} disabled={savingStatus}>
                {savingStatus ? <HealthIdLoadingIcon size="sm" label="Saving" /> : 'Save status'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
