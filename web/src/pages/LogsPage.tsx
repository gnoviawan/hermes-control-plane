import { Card, Col, Empty, Row, Segmented, Table, Tag, Typography } from 'antd'
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
  const infoCount = (data ?? []).filter((entry) => entry.level === 'INFO').length
  const warnCount = (data ?? []).filter((entry) => entry.level === 'WARN').length
  const errorCount = (data ?? []).filter((entry) => entry.level === 'ERROR').length

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

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Info logs</span>
            <Typography.Title level={3}>{infoCount}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Warnings</span>
            <Typography.Title level={3}>{warnCount}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Errors</span>
            <Typography.Title level={3}>{errorCount}</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Card className="glass-panel qwen-section-card" title="Log stream">
        {filteredData.length ? (
          <Table rowKey="id" loading={isLoading} dataSource={filteredData} columns={columns} pagination={false} />
        ) : (
          <Empty description="No logs for the selected level" />
        )}
      </Card>
    </div>
  )
}
