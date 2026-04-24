import { Card, Col, List, Row, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import { useProfileStore } from '../store/profileStore'
import type { CronJob } from '../types'

const statusColor = (status: string) => {
  if (status === 'running') return 'blue'
  if (status === 'paused') return 'default'
  if (status === 'triggered') return 'purple'
  if (status === 'failed') return 'red'
  return 'green'
}

const columns: ColumnsType<CronJob> = [
  { title: 'Job', dataIndex: 'name' },
  { title: 'Schedule', dataIndex: 'schedule' },
  { title: 'Delivery', dataIndex: 'deliverTarget', render: (value?: string) => value ?? '—' },
  { title: 'Last run', dataIndex: 'lastRun', render: (value?: string) => (value ? new Date(value).toLocaleString() : '—') },
  { title: 'Next run', dataIndex: 'nextRun', render: (value?: string) => (value ? new Date(value).toLocaleString() : '—') },
  { title: 'Status', dataIndex: 'status', render: (value: string) => <Tag color={statusColor(value)}>{value}</Tag> },
]

export function CronJobsPage() {
  const { selectedProfileId } = useProfileStore()
  const profileId = selectedProfileId ?? 'default'
  const { data, isLoading, isMock, error, refresh } = useApiQuery(() => apiClient.getCronJobs(profileId), [profileId])

  const enabledCount = (data ?? []).filter((job) => job.enabled).length
  const pausedCount = (data ?? []).filter((job) => !job.enabled).length
  const skillBackedCount = (data ?? []).filter((job) => job.skills.length > 0).length

  return (
    <div className="page-stack">
      <PageHeader
        title="Cron Jobs"
        description="Track profile-scoped schedules, delivery targets, and trigger state across Hermes automation." 
        mock={isMock}
        error={error}
        onRefresh={refresh}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Current profile</span>
            <Typography.Title level={3}>{profileId}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Enabled jobs</span>
            <Typography.Title level={3}>{enabledCount}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Skill-backed jobs</span>
            <Typography.Title level={3}>{skillBackedCount}</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card className="glass-panel qwen-section-card" title="Scheduled jobs" loading={isLoading}>
            <Table
              rowKey="id"
              dataSource={data ?? []}
              columns={columns}
              pagination={false}
              expandable={{
                expandedRowRender: (record) => (
                  <Space direction="vertical" size={6}>
                    <Typography.Text>Prompt: {record.promptPreview ?? '—'}</Typography.Text>
                    <Typography.Text>Skills: {record.skills.join(', ') || '—'}</Typography.Text>
                    <Typography.Text type="secondary">Last status: {record.lastStatus ?? '—'}</Typography.Text>
                  </Space>
                ),
              }}
            />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card className="glass-panel qwen-section-card" title="Operational summary" loading={isLoading}>
            <List
              size="small"
              dataSource={[
                `Paused jobs: ${pausedCount}`,
                `Delivery targets: ${Array.from(new Set((data ?? []).map((job) => job.deliverTarget).filter(Boolean))).join(', ') || '—'}`,
                `Statuses: ${Array.from(new Set((data ?? []).map((job) => job.status))).join(', ') || '—'}`,
              ]}
              renderItem={(item) => <List.Item>{item}</List.Item>}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
