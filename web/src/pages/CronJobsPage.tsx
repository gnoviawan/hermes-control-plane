import { Card, Col, Row, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import type { CronJob } from '../types'

const columns: ColumnsType<CronJob> = [
  { title: 'Job', dataIndex: 'name' },
  { title: 'Profile', dataIndex: 'profileId' },
  { title: 'Schedule', dataIndex: 'schedule' },
  { title: 'Last run', dataIndex: 'lastRun', render: (value) => (value === 'Paused' ? value : new Date(value).toLocaleString()) },
  { title: 'Next run', dataIndex: 'nextRun', render: (value) => (value === 'Paused' ? value : new Date(value).toLocaleString()) },
  { title: 'State', dataIndex: 'enabled', render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? 'Enabled' : 'Paused'}</Tag> },
]

export function CronJobsPage() {
  const { data, isLoading, isMock, error, refresh } = useApiQuery(apiClient.getCronJobs, [])
  const enabledCount = (data ?? []).filter((job) => job.enabled).length
  const pausedCount = (data ?? []).filter((job) => !job.enabled).length
  const profilesCovered = new Set((data ?? []).map((job) => job.profileId)).size

  return (
    <div className="page-stack">
      <PageHeader
        title="Cron Jobs"
        description="Track recurring maintenance and control plane automation across Hermes profiles."
        mock={isMock}
        error={error}
        onRefresh={refresh}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Enabled jobs</span>
            <Typography.Title level={3}>{enabledCount}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Paused jobs</span>
            <Typography.Title level={3}>{pausedCount}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Profiles covered</span>
            <Typography.Title level={3}>{profilesCovered}</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Card className="glass-panel qwen-section-card" title="Scheduled jobs">
        <Table rowKey="id" loading={isLoading} dataSource={data ?? []} columns={columns} pagination={false} />
      </Card>
    </div>
  )
}
