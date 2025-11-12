import { type ChangeEvent } from 'react'

type Props = {
  label?: string
  description?: string
  name: string
  value: string
  update: (v: string | null) => void
}

export function ImageInput({ label, description, name, value, update }: Props) {
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const [f] = e.currentTarget.files!
    if (!f) return update(null)

    const reader = new FileReader()
    reader.onload = (e) => update(e.target!.result as string)
    reader.readAsDataURL(f)
  }

  return (
    <label className="flex flex-col gap-2">
      {!!label && <div className="text-sm/6 font-medium text-gray-900 dark:text-white">{label}</div>}

      <div className="block rounded-lg overflow-hidden bg-white outline -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:outline-white/10 dark:focus:outline-indigo-500">
        {value ?
          <img src={value} />
        : <div className="p-4 flex justify-center">
            <svg
              className="size-8 text-gray-400"
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
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
          </div>
        }
      </div>

      {!!description && <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>}

      <input type="file" name={name} onChange={onChange} className="hidden" accept="image/*" />
    </label>
  )
}
