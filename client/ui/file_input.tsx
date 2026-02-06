import { type ChangeEvent } from 'react'

type Props = {
  kind: 'audio' | 'image'
  label?: string
  description?: string
  name: string
  value: string
  update: (v: string | null) => void
}

export function FileInput({ kind, label, description, name, value, update }: Props) {
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
          renderValue(kind, value)
        : <div className="p-4 flex justify-center">
            <svg
              className="size-8 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d={icon(kind)} />
            </svg>
          </div>
        }
      </div>

      {!!description && <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>}

      <input type="file" name={name} onChange={onChange} className="hidden" accept={accept(kind)} />
    </label>
  )
}

function accept(kind: 'audio' | 'image') {
  switch (kind) {
    case 'audio':
      return 'audio/*'
    case 'image':
      return 'image/*'
  }
}

function renderValue(kind: 'audio' | 'image', value: string) {
  switch (kind) {
    case 'audio':
      return (
        <div className="p-2">
          <audio src={value} controls controlsList="nodownload nofullscreen noremoteplayback" className="block w-full h-8" />
          <div className="pt-2 text-center text-xs text-gray-500 dark:text-gray-400">Click to select another audio file</div>
        </div>
      )
    case 'image':
      return <img src={value} />
  }
}

function icon(kind: 'audio' | 'image') {
  switch (kind) {
    case 'audio':
      return 'm9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z'
    case 'image':
      return 'm2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z'
  }
}
