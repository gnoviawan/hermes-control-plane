import { Card, Space, Tag, Typography } from 'antd'
import type { ReactNode } from 'react'

export function ShellCard({ title, extra, children }: { title: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <Card className="glass-panel" title={title} extra={extra}>
      {children}
    </Card>
  )
}

export function InlineMeta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Space direction="vertical" size={2}>
      <Typography.Text type="secondary">{label}</Typography.Text>
      <Typography.Text>{value}</Typography.Text>
    </Space>
  )
}

export function SoftTag({ children, color = 'blue' }: { children: ReactNode; color?: string }) {
  return <Tag color={color}>{children}</Tag>
}
