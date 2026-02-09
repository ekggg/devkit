import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type FontOption = {
  name: string
  value: string
}

export type FontGroup = {
  label: string
  options: FontOption[]
}

type Props = {
  label?: string
  description?: string
  name: string
  value: string
  options: FontGroup[]
  update: (v: string | null) => void
}

export function FontSelector({ label, description, name, value, options, update }: Props) {
  const valueToName = useMemo(() => {
    return options
      .flatMap((g) => g.options)
      .reduce((acc, opt) => {
        acc.set(opt.value, opt.name)
        return acc
      }, new Map<string, string>())
  }, [options])

  const [filter, setFilter] = useState(valueToName.get(value) ?? '')
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Keep the displayed font up-to-date if the manifest/state manually changes
  useEffect(() => {
    setFilter(valueToName.get(value) ?? '')
  }, [value])

  const filteredGroups = useMemo(() => {
    if (!filter) return options
    const f = filter.toLowerCase()
    return options.map((group) => ({
      ...group,
      options: group.options.filter((opt) => opt.name.toLowerCase().includes(f)),
    }))
  }, [options, filter])

  const select = useCallback(
    (v: string) => {
      setSelected(v)
      const el = document.getElementById(`${name}-${v}`)
      setTimeout(() => {
        el?.scrollIntoView({
          behavior: 'instant',
          block: 'center',
          // @ts-expect-error Added in Chrome 140
          container: 'nearest',
        })
      }, 10)
    },
    [name],
  )

  const commit = useCallback(
    (v: string) => {
      inputRef.current?.blur()
      update(v)
      setFilter(valueToName.get(v) ?? '')
    },
    [update, valueToName],
  )

  const validOptions = useCallback(
    (filter: string) => {
      const f = filter.toLowerCase()
      return options
        .flatMap((g) => g.options)
        .filter((o) => o.name.toLowerCase().includes(f))
        .map((o) => o.value)
    },
    [options],
  )

  return (
    <div className="flex flex-col gap-2">
      {!!label && (
        <label htmlFor={name} className="text-sm/6 font-medium text-gray-900 dark:text-white">
          {label}
        </label>
      )}

      <input
        ref={inputRef}
        type="text"
        id={name}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={`${name}-list`}
        aria-activedescendant={selected && `${name}-${selected}`}
        className="block w-full rounded-md bg-white text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500 px-3 py-1.5"
        value={filter}
        onFocus={() => {
          setFilter('')
          setIsOpen(true)
          // @ts-expect-error Don't understand source yet
          listRef.current?.showPopover({ source: inputRef.current })
          select(value)
        }}
        onBlur={() => {
          const valid = filteredGroups.flatMap((g) => g.options)
          if (valid.length === 1) {
            commit(valid[0]!.value)
          } else {
            setFilter(valueToName.get(value) ?? '')
          }
          setSelected('')
          setIsOpen(false)
          listRef.current?.hidePopover()
        }}
        onChange={(e) => {
          setFilter(e.target.value)
          if (selected && selected.toLowerCase().includes(e.target.value.toLowerCase())) {
            // Keep the selected element in the viewport
            select(selected)
          } else {
            const [firstValid] = validOptions(e.target.value)
            select(firstValid ?? '')
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            e.preventDefault()
            inputRef.current?.blur()
          }
          if (e.key === 'Enter' && selected) {
            e.preventDefault()
            commit(selected)
          }
          if (['Tab', 'ArrowDown', 'ArrowUp'].includes(e.key) && selected) {
            const valid = validOptions(filter)
            const idx = valid.indexOf(selected)
            const target = e.shiftKey || e.key === 'ArrowUp' ? idx - 1 : idx + 1
            if (target >= 0 && target < valid.length) {
              e.preventDefault()
              select(valid[target]!)
            }
          }
        }}
      />

      <div
        ref={listRef}
        id={`${name}-list`}
        role="listbox"
        popover="manual"
        className="inset-[unset] w-auto max-h-48 top-[calc(anchor(bottom)+0.25rem)] left-[calc(anchor(left))] right-[calc(anchor(right))] transition transition-discrete opacity-0 starting:open:opacity-0 open:opacity-100 rounded-md border bg-slate-950 border-slate-200 text-slate-200"
      >
        {filteredGroups.map((group) => (
          <div key={group.label} className="group">
            <div className="px-2 pt-2 text-xs text-slate-400" role="presentation">
              {group.label}
            </div>
            {group.options.length === 0 && <div className="p-2 text-sm text-slate-300 italic text-center">No results found</div>}
            {group.options.map((option) => {
              return (
                <div
                  key={option.value}
                  id={`${name}-${option.value}`}
                  role="option"
                  aria-selected={selected === option.value}
                  className={`p-2 text-sm cursor-pointer ${
                    selected === option.value ? 'bg-white/20 text-white' : 'hover:bg-white/20 hover:text-white'
                  }`}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    commit(option.value)
                  }}
                >
                  {option.name}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {!!description && <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>}
    </div>
  )
}
