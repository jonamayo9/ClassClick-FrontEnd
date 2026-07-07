import { Children, isValidElement, type ChangeEvent, type ReactNode, type SelectHTMLAttributes } from 'react'
import { SelectField, type SelectOption } from './select-field'

type LegacySelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'defaultValue'> & {
  value?: string | number
  defaultValue?: string | number
  children?: ReactNode
}

function readLabel(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(readLabel).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return readLabel(node.props.children)
  return ''
}

function readOptions(children: ReactNode) {
  const options: SelectOption[] = []
  let placeholder: string | undefined

  Children.forEach(children, (child) => {
    if (!isValidElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>(child)) return
    if (child.type !== 'option') {
      const nested = readOptions(child.props.children)
      options.push(...nested.options)
      placeholder ??= nested.placeholder
      return
    }

    const value = String(child.props.value ?? '')
    const label = readLabel(child.props.children)
    if (!value) {
      placeholder ??= label
      return
    }
    options.push({ value, label, disabled: child.props.disabled })
  })

  return { options, placeholder }
}

export function Select({
  value,
  defaultValue,
  children,
  onChange,
  disabled,
  className,
  'aria-label': ariaLabel,
}: LegacySelectProps) {
  const parsed = readOptions(children)
  const currentValue = String(value ?? defaultValue ?? '')

  return (
    <SelectField
      value={currentValue}
      onValueChange={(nextValue) => {
        onChange?.({ target: { value: nextValue }, currentTarget: { value: nextValue } } as unknown as ChangeEvent<HTMLSelectElement>)
      }}
      options={parsed.options}
      placeholder={parsed.placeholder}
      disabled={disabled}
      className={className}
      aria-label={ariaLabel}
    />
  )
}
