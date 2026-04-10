interface Props { lines?: number; className?: string }

export function LoadingSkeleton({ lines = 3, className = '' }: Props) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-4 rounded bg-gray-200" style={{ width: `${Math.max(30, 85 - i * 10)}%` }} />
      ))}
    </div>
  )
}
