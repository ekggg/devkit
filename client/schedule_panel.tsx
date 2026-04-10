import { useAutoAnimate } from '@formkit/auto-animate/react'
import { ChevronLeft, ChevronRight, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import type { CalendarEvent } from './zod'
import { generateDefaultScheduleEvents, getDefaultWeekStart, randString } from './fixtures'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

function shiftWeek(weekStart: string, days: number): string {
  const d = new Date(weekStart + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return formatDate(d)
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dow = DAY_LABELS[(d.getDay() + 6) % 7]
  return `${dow} ${d.getMonth() + 1}/${d.getDate()}`
}

export function SchedulePanel({
  weekStart,
  setWeekStart,
  events,
  setEvents,
}: {
  weekStart: string
  setWeekStart: (v: string) => void
  events: CalendarEvent[]
  setEvents: (v: CalendarEvent[]) => void
}) {
  const sortedEvents = [...events].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    return (a.time ?? '') < (b.time ?? '') ? -1 : 1
  })

  const updateEvent = (index: number, patch: Partial<CalendarEvent>) => {
    const original = sortedEvents[index]!
    const updated = { ...original, ...patch }
    setEvents(events.map((e) => (e === original ? updated : e)))
  }

  const removeEvent = (index: number) => {
    const original = sortedEvents[index]!
    setEvents(events.filter((e) => e !== original))
  }

  const [listRef] = useAutoAnimate()

  const addEvent = () => {
    setEvents([...events, { id: randString(8), date: weekStart, title: '' }])
  }

  const generateSample = () => {
    setEvents(generateDefaultScheduleEvents(weekStart))
  }

  return (
    <>
      <h1 className="text-xl font-bold py-4">Test Schedule</h1>

      <div className="flex items-center gap-1">
        <Button variant="secondary" size="xs" onClick={() => setWeekStart(shiftWeek(weekStart, -7))}>
          <ChevronLeft className="size-4" />
        </Button>
        <input
          type="date"
          value={weekStart}
          onChange={(e) => setWeekStart(e.target.value)}
          className="flex-1 rounded-md bg-white px-2 py-1 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
        />
        <Button variant="secondary" size="xs" onClick={() => setWeekStart(shiftWeek(weekStart, 7))}>
          <ChevronRight className="size-4" />
        </Button>
        <Button variant="secondary" size="xs" onClick={() => setWeekStart(getDefaultWeekStart())} title="Go to current week">
          Today
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="grow" onClick={addEvent}>
          <Plus className="size-3.5" /> Add Event
        </Button>
        <Button variant="secondary" size="sm" onClick={generateSample} title="Generate sample schedule">
          <Sparkles className="size-3.5" />
        </Button>
      </div>

      <div ref={listRef} className="flex flex-col gap-3">
        {sortedEvents.map((event, i) => (
          <div key={event.id} className="rounded-md bg-gray-100 dark:bg-white/5 p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{event.date ? dayLabel(event.date) : 'No date'}</span>
              <button type="button" onClick={() => removeEvent(i)} className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition">
                <Trash2 className="size-3.5" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                value={event.date}
                onChange={(e) => updateEvent(i, { date: e.target.value })}
                className="flex-1 rounded bg-white px-2 py-1 text-xs text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
              />
              <input
                type="time"
                value={event.time ?? ''}
                onChange={(e) => updateEvent(i, { time: e.target.value || undefined })}
                className="w-24 rounded bg-white px-2 py-1 text-xs text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
              />
            </div>
            <Input type="text" name={`title-${i}`} value={event.title} update={(v) => updateEvent(i, { title: v })} placeholder="Title" className="!text-xs !px-2 !py-1" />
            <Input type="text" name={`subtitle-${i}`} value={event.subtitle ?? ''} update={(v) => updateEvent(i, { subtitle: v || undefined })} placeholder="Subtitle (optional)" className="!text-xs !px-2 !py-1" />
          </div>
        ))}
        {sortedEvents.length === 0 && (
          <div className="text-sm text-gray-500 text-center py-4">
            No events. Click "Add Event" or generate sample data.
          </div>
        )}
      </div>
    </>
  )
}
