import { Card, Table, Tag } from 'antd'
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

  return (
    <div className="page-stack">
      <PageHeader
        title="Cron Jobs"
        description="Track recurring maintenance and control plane automation across Hermes profiles."
        mock={isMock}
        error={error}
        onRefresh={refresh}
      />
      <Card className="glass-panel" title="Scheduled jobs">
        <Table rowKey="id" loading={isLoading} dataSource={data ?? []} columns={columns} pagination={false} />
      </Card>
    </div>
  )
}
