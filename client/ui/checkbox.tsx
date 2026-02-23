type Props = {
  label: string
  description?: string
  name: string
  value: boolean
  update: (v: boolean) => void
}

export function Checkbox({ label, description, name, value, update }: Props) {
  return (
    <label className="flex gap-3">
      <div className="group grid w-4 h-6 shrink-0 grid-cols-1 py-1">
        <input
          type="checkbox"
          name={name}
          checked={value}
          onChange={(e) => update(e.target.checked)}
          className="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-indigo-600 checked:bg-indigo-600 indeterminate:border-indigo-600 indeterminate:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:checked:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:checked:border-indigo-500 dark:checked:bg-indigo-500 dark:indeterminate:border-indigo-500 dark:indeterminate:bg-indigo-500 dark:focus-visible:outline-indigo-500 dark:disabled:border-white/5 dark:disabled:bg-white/10 dark:disabled:checked:bg-white/10 forced-colors:appearance-auto"
        />
        <svg
          viewBox="0 0 14 14"
          fill="none"
          className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled:stroke-gray-950/25 dark:group-has-disabled:stroke-white/25"
        >
          <path
            d="M3 8L6 11L11 3.5"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-0 group-has-checked:opacity-100"
          />
          <path
            d="M3 7H11"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-0 group-has-indeterminate:opacity-100"
          />
        </svg>
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-sm/6 font-medium text-gray-900 dark:text-white">{label}</div>
        {!!description && <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>}
      </div>
    </label>
  )
}
