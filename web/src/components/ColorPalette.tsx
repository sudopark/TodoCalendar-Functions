export const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
]

interface ColorPaletteProps {
  colors?: string[]
  selected: string
  onChange: (hex: string) => void
}

export function ColorPalette({ colors = PRESET_COLORS, selected, onChange }: ColorPaletteProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map(color => (
        <button
          key={color}
          title={color}
          onClick={() => onChange(color)}
          className={`h-7 w-7 rounded-full border-2 transition-transform ${
            selected === color ? 'border-gray-800 scale-110' : 'border-transparent'
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}
