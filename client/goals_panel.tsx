import { useAutoAnimate } from '@formkit/auto-animate/react'
import { Plus, Send, Sparkles, Trash2 } from 'lucide-react'
import { GOAL_TYPES, GOAL_TYPE_LABELS, generateDefaultGoals, isMonetaryGoal, randString, type GoalType } from './fixtures'
import { Button } from './ui/button'
import { Input, IntegerInput } from './ui/input'
import { Select } from './ui/select'
import type { Goal } from './zod'

const typeOptions = GOAL_TYPES.map((value) => ({ value, label: GOAL_TYPE_LABELS[value] }))
const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
]

export function GoalsPanel({
  goals,
  setGoals,
  fireGoalUpdate,
}: {
  goals: Goal[]
  setGoals: (v: Goal[]) => void
  fireGoalUpdate: (goal: Goal) => void
}) {
  const updateGoal = (id: string, patch: Partial<Goal>) => {
    setGoals(goals.map((g) => (g.id === id ? { ...g, ...patch } : g)))
  }

  const removeGoal = (id: string) => {
    setGoals(goals.filter((g) => g.id !== id))
  }

  const addGoal = () => {
    setGoals([
      ...goals,
      { id: `goal_${randString(8)}`, type: 'new_followers', name: 'New Goal', status: 'active', start: 0, current: 0, target: 100, currency: null },
    ])
  }

  const generateSample = () => {
    setGoals(generateDefaultGoals())
  }

  const setType = (id: string, type: GoalType) => {
    // Monetary goals require a currency; clear it for every other type.
    updateGoal(id, { type, currency: isMonetaryGoal(type) ? (goals.find((g) => g.id === id)?.currency ?? 'USD') : null })
  }

  const [listRef] = useAutoAnimate()

  return (
    <>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Active goals are exposed to the widget via <code>initialData.activeGoals</code>. Use "Send update" to fire an{' '}
        <code>ekg.goal.updated</code> event.
      </p>

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="grow" onClick={addGoal}>
          <Plus className="size-3.5" /> Add Goal
        </Button>
        <Button variant="secondary" size="sm" onClick={generateSample} title="Generate sample goals">
          <Sparkles className="size-3.5" />
        </Button>
      </div>

      <div ref={listRef} className="flex flex-col gap-3">
        {goals.map((goal) => {
          const monetary = isMonetaryGoal(goal.type)
          return (
            <div key={goal.id} className="rounded-md bg-gray-100 dark:bg-white/5 p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {goal.target > goal.start ? Math.round((100 * (goal.current - goal.start)) / (goal.target - goal.start)) : 0}% complete
                </span>
                <button
                  type="button"
                  onClick={() => removeGoal(goal.id)}
                  className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              <Input type="text" name={`goal-name-${goal.id}`} value={goal.name} update={(v) => updateGoal(goal.id, { name: v })} placeholder="Name" className="!text-xs !px-2 !py-1" />

              <Select name={`goal-type-${goal.id}`} value={goal.type} update={(v) => setType(goal.id, v as GoalType)} options={typeOptions} className="!text-xs !px-2 !py-1" />

              <div className="flex gap-2">
                <IntegerInput label="Start" name={`goal-start-${goal.id}`} value={goal.start} update={(v) => updateGoal(goal.id, { start: v })} className="!text-xs !px-2 !py-1" />
                <IntegerInput label="Current" name={`goal-current-${goal.id}`} value={goal.current} update={(v) => updateGoal(goal.id, { current: v })} className="!text-xs !px-2 !py-1" />
                <IntegerInput label="Target" name={`goal-target-${goal.id}`} value={goal.target} update={(v) => updateGoal(goal.id, { target: v })} className="!text-xs !px-2 !py-1" />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <Select name={`goal-status-${goal.id}`} value={goal.status} update={(v) => updateGoal(goal.id, { status: v as Goal['status'] })} options={statusOptions} className="!text-xs !px-2 !py-1" />
                </div>
                {monetary && (
                  <div className="w-24">
                    <Input type="text" name={`goal-currency-${goal.id}`} value={goal.currency ?? ''} update={(v) => updateGoal(goal.id, { currency: v || null })} placeholder="USD" className="!text-xs !px-2 !py-1" />
                  </div>
                )}
              </div>

              <Button variant="secondary" size="sm" onClick={() => fireGoalUpdate(goal)}>
                <Send className="size-3.5" /> Send update
              </Button>
            </div>
          )
        })}
        {goals.length === 0 && (
          <div className="text-sm text-gray-500 text-center py-4">No goals. Click "Add Goal" or generate sample data.</div>
        )}
      </div>
    </>
  )
}
