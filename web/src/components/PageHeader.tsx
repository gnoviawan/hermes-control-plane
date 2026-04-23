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
      <div className="page-header qwen-page-header">
        <div className="page-header-copy qwen-page-header-copy">
          <div className="qwen-breadcrumb-row">
            <span className="qwen-breadcrumb-parent">Hermes Control</span>
            <span className="qwen-breadcrumb-separator">/</span>
            <span className="qwen-breadcrumb-current">{title}</span>
          </div>
          <Typography.Paragraph className="qwen-page-description">{description}</Typography.Paragraph>
        </div>
        <Space wrap className="qwen-page-header-actions">
          {actions}
          {onRefresh ? <Button className="qwen-page-refresh" onClick={onRefresh}>Refresh</Button> : null}
        </Space>
      </div>
      {mock ? (
        <Alert
          showIcon
          type="warning"
          message="Mock data active"
          description={error ?? 'Backend routes are not available yet, so the UI is using the planned endpoint shape.'}
        />
      ) : null}
      {!mock && error ? <Alert showIcon type="error" message="Request failed" description={error} /> : null}
    </div>
  )
}
