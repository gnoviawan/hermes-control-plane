import { Badge } from 'antd'
import type { HealthState } from '../types'

const colors: Record<HealthState, string> = {
  healthy: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  idle: '#64748b',
}

export function StatusBadge({ status, text }: { status: HealthState; text?: string }) {
  return <Badge color={colors[status]} text={text ?? status} />
}
