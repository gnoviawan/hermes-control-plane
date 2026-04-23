import { Card, Empty, Segmented, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import type { LogEntry } from '../types'

const columns: ColumnsType<LogEntry> = [
  { title: 'Timestamp', dataIndex: 'timestamp', render: (value) => new Date(value).toLocaleString() },
  { title: 'Level', dataIndex: 'level', render: (value: LogEntry['level']) => <Tag color={value === 'ERROR' ? 'red' : value === 'WARN' ? 'gold' : 'blue'}>{value}</Tag> },
  { title: 'Source', dataIndex: 'source' },
  {
    title: 'Message',
    dataIndex: 'message',
    render: (value: string) => <Typography.Text code>{value}</Typography.Text>,
  },
]

export function LogsPage() {
  const [level, setLevel] = useState<'ALL' | LogEntry['level']>('ALL')
  const { data, isLoading, isMock, error, refresh } = useApiQuery(apiClient.getLogs, [])

  const filteredData = useMemo(
    () => (data ?? []).filter((entry) => level === 'ALL' || entry.level === level),
    [data, level],
  )

  return (
    <div className="page-stack">
      <PageHeader
        title="Logs"
        description="Review control plane, sidecar, and automation logs with quick severity filtering."
        mock={isMock}
        error={error}
        actions={<Segmented value={level} options={['ALL', 'INFO', 'WARN', 'ERROR']} onChange={(value) => setLevel(value as typeof level)} />}
        onRefresh={refresh}
      />
      <Card className="glass-panel" title="Log stream">
        {filteredData.length ? (
          <Table rowKey="id" loading={isLoading} dataSource={filteredData} columns={columns} pagination={false} />
        ) : (
          <Empty description="No logs for the selected level" />
        )}
      </Card>
    </div>
  )
}
