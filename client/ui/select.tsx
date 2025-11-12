import { cn } from '../shadcn'

type Props = {
  label?: string
  description?: string
  name: string
  value: string
  update: (v: string) => void
  options: { label: string; value: string }[]
}

export function Select({ label, description, name, value, update, options }: Props) {
  return (
    <label className="flex flex-col gap-2">
      {!!label && <div className="text-sm/6 font-medium text-gray-900 dark:text-white">{label}</div>}

      <select
        name={name}
        value={value}
        onChange={(e) => update(e.currentTarget.value)}
        className={cn([
          'appearance-select picker:appearance-select picker:top-[calc(anchor(bottom)+0.5rem)]',
          'picker-icon:hidden disabled:cursor-not-allowed disabled:opacity-60',
          'picker:rounded-md picker:border picker:bg-slate-950 picker:border-slate-200 picker:text-slate-200',
        ])}
      >
        <button
          className={cn([
            'flex w-full items-center justify-between gap-2 px-3 py-1.5 rounded-md text-base outline-1 -outline-offset-1 focus:outline-2 focus:-outline-offset-2',
            'bg-white text-gray-900 outline-gray-300 hover:outline-indigo-600/20 focus:outline-indigo-600',
            'dark:bg-white/5 dark:text-white dark:outline-white/10 dark:hover:outline-indigo-500/20 dark:focus:outline-indigo-500',
            'transition group-hover/select:bg-slate-950/50 group-has-open/select:border-white group-has-open/select:text-white group-hover/select:text-white',
          ])}
        >
          <selectedcontent className="flex items-center gap-2 truncate"></selectedcontent>
          <svg className="size-5" role="img" width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <title>Selector</title>
            <path
              d="M4.93179 5.43179C4.75605 5.60753 4.75605 5.89245 4.93179 6.06819C5.10753 6.24392 5.39245 6.24392 5.56819 6.06819L7.49999 4.13638L9.43179 6.06819C9.60753 6.24392 9.89245 6.24392 10.0682 6.06819C10.2439 5.89245 10.2439 5.60753 10.0682 5.43179L7.81819 3.18179C7.73379 3.0974 7.61933 3.04999 7.49999 3.04999C7.38064 3.04999 7.26618 3.0974 7.18179 3.18179L4.93179 5.43179ZM10.0682 9.56819C10.2439 9.39245 10.2439 9.10753 10.0682 8.93179C9.89245 8.75606 9.60753 8.75606 9.43179 8.93179L7.49999 10.8636L5.56819 8.93179C5.39245 8.75606 5.10753 8.75606 4.93179 8.93179C4.75605 9.10753 4.75605 9.39245 4.93179 9.56819L7.18179 11.8182C7.35753 11.9939 7.64245 11.9939 7.81819 11.8182L10.0682 9.56819Z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            ></path>
          </svg>
        </button>
        {options.map((o) => (
          <option
            key={`${name}-${o.value}`}
            value={o.value}
            className="items-center justify-between gap-2 p-2 text-sm checkmark:hidden focus:outline-none hover:bg-white/20 hover:text-white focus:bg-white/20 focus:text-white"
          >
            {o.label}
          </option>
        ))}
      </select>

      {!!description && <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>}
    </label>
  )
}
