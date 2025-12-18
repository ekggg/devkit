import {
  and,
  isBooleanControl,
  isEnumControl,
  isIntegerControl,
  isNumberControl,
  isStringControl,
  rankWith,
  schemaMatches,
  scopeEndIs,
  scopeEndsWith,
  uiTypeIs,
} from '@jsonforms/core'
import { JsonForms, JsonFormsDispatch, withJsonFormsControlProps, withJsonFormsEnumProps, withJsonFormsLayoutProps } from '@jsonforms/react'
import { vanillaCells, vanillaRenderers } from '@jsonforms/vanilla-renderers'
import Ajv2020 from 'ajv/dist/2020'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { DecimalInput, Input, IntegerInput } from './ui/input'
import { Select } from './ui/select'

const ajv = new Ajv2020()

const renderers = [
  ...vanillaRenderers,
  {
    tester: rankWith(5, uiTypeIs('VerticalLayout')),
    renderer: withJsonFormsLayoutProps((props) => {
      return (
        <>
          {props.visible &&
            props.uischema.elements.map((child, index) => (
              <JsonFormsDispatch
                schema={props.schema}
                uischema={child}
                path={props.path}
                enabled={props.enabled}
                renderers={props.renderers}
                cells={props.cells}
                key={index}
              />
            ))}
        </>
      )
    }),
  },
  {
    tester: rankWith(5, isStringControl),
    renderer: withJsonFormsControlProps((props) => {
      return (
        <Input
          label={props.label}
          description={props.description}
          name={props.id}
          value={props.data}
          update={(v) => props.handleChange(props.path, v)}
          type="text"
        />
      )
    }),
  },
  {
    tester: rankWith(5, isIntegerControl),
    renderer: withJsonFormsControlProps((props) => {
      return (
        <IntegerInput
          label={props.label}
          description={props.description}
          name={props.id}
          value={props.data || 0}
          update={(v) => props.handleChange(props.path, v)}
        />
      )
    }),
  },
  {
    tester: rankWith(5, isNumberControl),
    renderer: withJsonFormsControlProps((props) => {
      return (
        <DecimalInput
          label={props.label}
          description={props.description}
          name={props.id}
          value={props.data || 0}
          update={(v) => props.handleChange(props.path, v)}
        />
      )
    }),
  },
  {
    tester: rankWith(5, isBooleanControl),
    renderer: withJsonFormsControlProps((props) => {
      return (
        <Checkbox
          label={props.label}
          description={props.description}
          name={props.id}
          value={props.data}
          update={(v) => props.handleChange(props.path, v)}
        />
      )
    }),
  },
  {
    tester: rankWith(6, isEnumControl),
    renderer: withJsonFormsEnumProps((props) => {
      return (
        <Select
          label={props.label}
          description={props.description}
          name={props.id}
          value={props.data}
          update={(v) => props.handleChange(props.path, v)}
          options={props.options!}
        />
      )
    }),
  },
  {
    tester: rankWith(9, and(scopeEndsWith('At'), isIntegerControl)),
    renderer: withJsonFormsControlProps((props) => {
      const d = new Date(props.data)
      const YYYY = d.getFullYear()
      const MM = `00${d.getMonth() + 1}`.slice(-2)
      const DD = `00${d.getDate()}`.slice(-2)
      const hh = `00${d.getHours()}`.slice(-2)
      const mm = `00${d.getMinutes()}`.slice(-2)
      const ss = `00${d.getSeconds()}`.slice(-2)
      return (
        <Input
          label={props.label}
          description={props.description}
          name={props.id}
          value={`${YYYY}-${MM}-${DD}T${hh}:${mm}:${ss}`}
          update={(v) => props.handleChange(props.path, new Date(v).valueOf())}
          type="datetime-local"
        />
      )
    }),
  },
  {
    tester: rankWith(9, scopeEndIs('currency')),
    renderer: withJsonFormsControlProps((props) => {
      return (
        <Select
          label={props.label}
          description={props.description}
          name={props.id}
          value={props.data}
          update={(v) => props.handleChange(props.path, v)}
          options={[
            { label: 'US Dollar', value: 'USD' },
            { label: 'Twitch Bits', value: 'BITS' },
            { label: 'Euro', value: 'EUR' },
            { label: 'Japanese Yen', value: 'JPY' },
          ]}
        />
      )
    }),
  },
  {
    tester: rankWith(
      9,
      schemaMatches((schema) => schema.type === 'array' && schema.items?.$ref === '#/$defs/ChatNode'),
    ),
    renderer: withJsonFormsControlProps((props) => {
      return (
        <Input
          label={props.label}
          description={props.description}
          name={props.id}
          value={props.data[0].text}
          update={(v) => props.handleChange(props.path, [{ type: 'text', text: v }])}
          type="textarea"
        />
      )
    }),
  },
  {
    tester: rankWith(9, scopeEndIs('raw')),
    renderer: withJsonFormsControlProps((props) => {
      return (
        <Input
          label={props.label}
          description={props.description}
          name={props.id}
          value={JSON.stringify(props.data)}
          update={(v) => props.handleChange(props.path, JSON.parse(v))}
          type="textarea"
        />
      )
    }),
  },
]

export function EventModal(props: { id: string; name: string; schema: any; data: any; setData: (v: any) => void }) {
  return (
    <dialog
      id={props.id}
      closedby="any"
      className="m-auto backdrop:bg-black/50 backdrop:backdrop-blur-md dark:text-slate-100 dark:bg-slate-900 py-6 px-8 rounded-xl min-w-xl"
    >
      <div className="font-bold text-xl pb-4">{props.name}</div>
      <form method="dialog" className="flex flex-col gap-2">
        <JsonForms
          schema={props.schema}
          renderers={renderers}
          cells={vanillaCells}
          data={props.data}
          onChange={({ data }) => props.setData(data)}
          ajv={ajv}
        />
        <div className="h-2"></div>
        <Button type="submit" layout="block">
          Save
        </Button>
      </form>
    </dialog>
  )
}
