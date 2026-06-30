import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

export default function PaginationBar({
  page = 0,
  totalPages = 0,
  totalElements = 0,
  pageSize = 20,
  onPageChange,
  disabled = false,
}) {
  if (!totalPages || totalPages <= 1) return null

  const from = totalElements === 0 ? 0 : page * pageSize + 1
  const to = Math.min((page + 1) * pageSize, totalElements)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm text-white/70">
      <p>
        Showing {from}–{to} of {totalElements}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="default"
          className="h-9 px-3"
          disabled={disabled || page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <span className="px-2 tabular-nums">
          Page {page + 1} of {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="default"
          className="h-9 px-3"
          disabled={disabled || page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
