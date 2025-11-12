import type { ReactNode } from 'react'
import { Button } from './button'

type Item<T> = { idx: number; name: string; value: T; update: (v: T) => void }
type Props<T> = {
  label?: string
  description?: string
  name: string
  value: T[]
  update: (v: T[]) => void
  render: (item: Item<T>) => ReactNode
}

export function InputArray<T>({ label, description, name, value, update, render }: Props<T>) {
  const inputs = value.map(
    (v, idx) =>
      ({
        idx,
        name: `${name}-${idx + 1}`,
        value: v,
        update: (v: T) => {
          const n = [...value]
          n[idx] = v
          update(n)
        },
      }) satisfies Item<T>,
  )

  return (
    <fieldset className="flex flex-col gap-2">
      {!!label && (
        <div>
          <legend className="text-sm/6 font-medium text-gray-900 dark:text-white">{label}</legend>
        </div>
      )}

      {inputs.map((i) => (
        <div key={i.name} className="flex gap-2 w-full items-start">
          <div className="grow">{render(i)}</div>
          <Button variant="danger" className="shrink-0 p-2" onClick={() => update(value.filter((_v, idx) => idx !== i.idx))}>
            <svg
              className="size-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              aria-hidden="true"
              data-slot="icon"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
              />
            </svg>
          </Button>
        </div>
      ))}

      <Button variant="secondary" layout="block" className="text-sm" onClick={() => update([...value, '' as T])}>
        <svg
          className="size-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          aria-hidden="true"
          data-slot="icon"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add Item
      </Button>

      {!!description && <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>}
    </fieldset>
  )
}
