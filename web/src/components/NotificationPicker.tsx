import type { NotificationOption } from '../models'

const TIME_PRESETS = [
  { label: '정시', seconds: 0 },
  { label: '1분 전', seconds: -60 },
  { label: '5분 전', seconds: -300 },
  { label: '10분 전', seconds: -600 },
  { label: '15분 전', seconds: -900 },
  { label: '30분 전', seconds: -1800 },
  { label: '1시간 전', seconds: -3600 },
  { label: '2시간 전', seconds: -7200 },
  { label: '1일 전', seconds: -86400 },
  { label: '2일 전', seconds: -172800 },
  { label: '1주 전', seconds: -604800 },
] as const

const ALLDAY_PRESETS = [
  { label: '당일 오전 9시', dayOffset: 0, hour: 9, minute: 0 },
  { label: '당일 정오', dayOffset: 0, hour: 12, minute: 0 },
  { label: '1일 전 오전 9시', dayOffset: -1, hour: 9, minute: 0 },
  { label: '2일 전 오전 9시', dayOffset: -2, hour: 9, minute: 0 },
  { label: '1주 전 오전 9시', dayOffset: -7, hour: 9, minute: 0 },
] as const

interface NotificationPickerProps {
  value: NotificationOption[]
  onChange: (options: NotificationOption[]) => void
  isAllDay: boolean
}

function matchesTimePreset(opt: NotificationOption, seconds: number): boolean {
  return opt.type === 'time' && opt.seconds === seconds
}

function matchesAllDayPreset(opt: NotificationOption, dayOffset: number, hour: number, minute: number): boolean {
  return opt.type === 'allday' && opt.dayOffset === dayOffset && opt.hour === hour && opt.minute === minute
}

export function NotificationPicker({ value, onChange, isAllDay }: NotificationPickerProps) {
  if (isAllDay) {
    return (
      <div className="space-y-1">
        {ALLDAY_PRESETS.map((preset, i) => {
          const selected = value.some(v => matchesAllDayPreset(v, preset.dayOffset, preset.hour, preset.minute))
          return (
            <label key={i} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={selected}
                onChange={() => {
                  if (selected) {
                    onChange(value.filter(v => !matchesAllDayPreset(v, preset.dayOffset, preset.hour, preset.minute)))
                  } else {
                    onChange([...value, { type: 'allday', dayOffset: preset.dayOffset, hour: preset.hour, minute: preset.minute }])
                  }
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              {preset.label}
            </label>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {TIME_PRESETS.map((preset, i) => {
        const selected = value.some(v => matchesTimePreset(v, preset.seconds))
        return (
          <label key={i} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => {
                if (selected) {
                  onChange(value.filter(v => !matchesTimePreset(v, preset.seconds)))
                } else {
                  onChange([...value, { type: 'time', seconds: preset.seconds }])
                }
              }}
              className="h-4 w-4 rounded border-gray-300"
            />
            {preset.label}
          </label>
        )
      })}
    </div>
  )
}
