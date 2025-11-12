import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '../shadcn'

type Props = VariantProps<typeof buttonVariants> & ComponentProps<'button'>

const buttonVariants = cva(
  'flex items-center justify-center font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2',
  {
    variants: {
      variant: {
        primary:
          'bg-indigo-600 text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500',
        secondary:
          'bg-white text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20',
        danger:
          'bg-red-600 text-white shadow-xs hover:bg-red-500 focus-visible:outline-red-600 dark:bg-red-500 dark:shadow-none dark:hover:bg-red-400 dark:focus-visible:outline-red-500',
        none: '',
      },
      size: {
        xs: 'rounded-sm px-2 py-1 text-xs',
        sm: 'rounded-sm px-2 py-1 text-sm',
        md: 'rounded-md px-2.5 py-1.5 text-sm',
        lg: 'rounded-md px-3 py-2 text-sm',
        xl: 'rounded-md px-3.5 py-2.5 text-sm',
      },
      layout: {
        button: 'gap-2 whitespace-nowrap',
        block: 'w-full gap-x-4 gap-y-2 text-lg break-words',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'sm',
      layout: 'button',
    },
  },
)

export function Button({ variant, size, layout, className, type = 'button', ...rest }: Props) {
  return <button type={type} {...rest} className={cn(buttonVariants({ variant, size, layout, className }))} />
}
