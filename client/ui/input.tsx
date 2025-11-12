import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type ComponentProps } from 'react'
import { cn } from '../shadcn'

type Props<T> = {
  label?: string
  description?: string
  name: string
  value: T
  update: (v: T) => void
} & ComponentProps<'input'> &
  ComponentProps<'textarea'> & { alpha?: true }

export function Input({ label, description, name, value, update, type, className, ...rest }: Props<string>) {
  const DynamicInput = type === 'textarea' ? 'textarea' : 'input'
  const debouncedUpdate = useDebounced(update, 500)

  const [IValue, setIValue] = useState(value)
  useEffect(() => setIValue(value), [value])

  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const [cursor, setCursor] = useState<number | null>(null)
  useLayoutEffect(() => {
    ref.current?.setSelectionRange(cursor, cursor)
  }, [ref, cursor, IValue])

  const onChange = (e: ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => {
    setCursor(e.target.selectionStart)
    setIValue(e.currentTarget.value)
    debouncedUpdate(e.currentTarget.value)
  }

  return (
    <label className="flex flex-col gap-2">
      {!!label && <div className="text-sm/6 font-medium text-gray-900 dark:text-white">{label}</div>}

      <div>
        <DynamicInput
          type={type}
          name={name}
          value={IValue}
          onChange={onChange}
          className={cn([
            'block w-full rounded-md bg-white text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6',
            'dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500',
            type === 'textarea' && 'field-sizing-content min-h-16',
            type === 'color' && 'h-9',
            'px-3 py-1.5',
            className,
          ])}
          {...rest}
        />
      </div>

      {!!description && <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>}
    </label>
  )
}

export function ColorInput(props: Omit<Props<string>, 'type'>) {
  return <Input {...props} type="color" alpha />
}

export function IntegerInput({ value, update, ...props }: Omit<Props<number>, 'type'>) {
  return <Input {...props} type="text" inputMode="numeric" pattern="\d*" value={value.toString()} update={(v) => update(parseInt(v, 10))} />
}

export function DecimalInput({ value, update, ...props }: Omit<Props<number>, 'type'>) {
  return (
    <Input {...props} type="text" inputMode="numeric" pattern="\d*\.?\d*" value={value.toString()} update={(v) => update(parseFloat(v))} />
  )
}

function useDebounced<T extends (...args: any) => void>(func: T, wait: number) {
  if (typeof func !== 'function') {
    throw new TypeError('Expected a function')
  }

  const funcRef = useRef(func)
  funcRef.current = func

  const timerId = useRef<NodeJS.Timeout | null>(null)
  const debounced = useMemo(() => {
    return (...args: Parameters<T>) => {
      if (timerId.current) clearTimeout(timerId.current)
      timerId.current = setTimeout(() => {
        timerId.current = null
        funcRef.current(...args)
      }, wait)
    }
  }, [wait])

  return debounced
}
