import { Alert, Button, Space, Typography } from 'antd'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description: string
  mock?: boolean
  error?: string
  actions?: ReactNode
  onRefresh?: () => void
}

export function PageHeader({ title, description, mock, error, actions, onRefresh }: PageHeaderProps) {
  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-header-copy">
          <Typography.Title level={2}>{title}</Typography.Title>
          <Typography.Paragraph>{description}</Typography.Paragraph>
        </div>
        <Space wrap>
          {actions}
          {onRefresh ? <Button onClick={onRefresh}>Refresh</Button> : null}
        </Space>
      </div>
      {mock ? (
        <Alert
          showIcon
          type="warning"
          message="Mock data active"
          description={error ?? 'Backend routes are not available yet, so the UI is using the planned Phase 1 endpoint shapes.'}
        />
      ) : null}
      {!mock && error ? <Alert showIcon type="error" message="Request failed" description={error} /> : null}
    </div>
  )
}
