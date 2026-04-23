import { Card, Col, Row, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import type { SessionRecord } from '../types'

const sessionStatusColor: Record<SessionRecord['status'], string> = {
  running: 'processing',
  queued: 'gold',
  complete: 'green',
  failed: 'red',
}

const columns: ColumnsType<SessionRecord> = [
  {
    title: 'Session',
    dataIndex: 'title',
    render: (_, session) => (
      <Space direction="vertical" size={2}>
        <Typography.Text strong>{session.title}</Typography.Text>
        <Typography.Text type="secondary">{session.id}</Typography.Text>
      </Space>
    ),
  },
  { title: 'Agent', dataIndex: 'agent' },
  { title: 'Profile', dataIndex: 'profileId' },
  { title: 'Status', dataIndex: 'status', render: (value: SessionRecord['status']) => <Tag color={sessionStatusColor[value]}>{value}</Tag> },
  { title: 'Started', dataIndex: 'startedAt', render: (value) => new Date(value).toLocaleString() },
  { title: 'Updated', dataIndex: 'updatedAt', render: (value) => new Date(value).toLocaleString() },
]

export function SessionsPage() {
  const { data, isLoading, isMock, error, refresh } = useApiQuery(apiClient.getSessions, [])
  const runningCount = (data ?? []).filter((session) => session.status === 'running').length
  const queuedCount = (data ?? []).filter((session) => session.status === 'queued').length
  const failedCount = (data ?? []).filter((session) => session.status === 'failed').length

  return (
    <div className="page-stack">
      <PageHeader
        title="Sessions"
        description="Inspect live and historical Hermes sessions across profiles with queue and completion state."
        mock={isMock}
        error={error}
        onRefresh={refresh}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Active sessions</span>
            <Typography.Title level={3}>{runningCount}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Queued</span>
            <Typography.Title level={3}>{queuedCount}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Failed</span>
            <Typography.Title level={3}>{failedCount}</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Card className="glass-panel qwen-section-card" title="Sessions explorer">
        <Table rowKey="id" loading={isLoading} dataSource={data ?? []} columns={columns} pagination={false} />
      </Card>
    </div>
  )
}
