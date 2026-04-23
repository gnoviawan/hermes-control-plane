import { useMemo, useState } from 'react'
import { Card, Col, Input, Row, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import { useProfileStore } from '../store/profileStore'
import type { ApiResult, SessionDetailRecord, SessionRecord } from '../types'

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
  {
    title: 'Source',
    dataIndex: 'agent',
    render: (value: string, session) => (
      <Space direction="vertical" size={2}>
        <Typography.Text>{value}</Typography.Text>
        <Typography.Text type="secondary">{session.searchableExcerpt ?? '—'}</Typography.Text>
      </Space>
    ),
  },
  { title: 'Messages', dataIndex: 'messageCount' },
  { title: 'Status', dataIndex: 'status', render: (value: SessionRecord['status']) => <Tag color={sessionStatusColor[value]}>{value}</Tag> },
  { title: 'Updated', dataIndex: 'updatedAt', render: (value: string) => new Date(value).toLocaleString() },
]

export function SessionsPage() {
  const { selectedProfileId } = useProfileStore()
  const profileId = selectedProfileId ?? 'default'
  const [search, setSearch] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState<string>()

  const sessionsQuery = useApiQuery<SessionRecord[]>(() => apiClient.getAgentSessions(profileId, search), [profileId, search])
  const sessions = useMemo<SessionRecord[]>(() => sessionsQuery.data ?? [], [sessionsQuery.data])
  const effectiveSelectedSessionId = useMemo<string | undefined>(() => {
    if (!sessions.length) return undefined
    if (selectedSessionId && sessions.some((session) => session.id === selectedSessionId)) {
      return selectedSessionId
    }
    return sessions[0].id
  }, [selectedSessionId, sessions])

  const detailQuery = useApiQuery<SessionDetailRecord | undefined>(
    () =>
      effectiveSelectedSessionId
        ? apiClient.getAgentSession(profileId, effectiveSelectedSessionId)
        : Promise.resolve<ApiResult<SessionDetailRecord | undefined>>({ data: undefined, mock: sessionsQuery.isMock }),
    [effectiveSelectedSessionId, profileId, sessionsQuery.isMock],
  )

  const selectedSession = detailQuery.data
  const runningCount = sessions.filter((session) => session.status === 'running').length
  const queuedCount = sessions.filter((session) => session.status === 'queued').length
  const failedCount = sessions.filter((session) => session.status === 'failed').length
  const transcriptLines = useMemo(() => selectedSession?.messages ?? [], [selectedSession])

  return (
    <div className="page-stack">
      <PageHeader
        title="Sessions"
        description="Inspect agent-scoped Hermes sessions with search, metadata, and transcript navigation."
        mock={sessionsQuery.isMock || detailQuery.isMock}
        error={sessionsQuery.error ?? detailQuery.error}
        onRefresh={async () => {
          await sessionsQuery.refresh()
          await detailQuery.refresh()
        }}
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

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            className="glass-panel qwen-section-card"
            title="Sessions explorer"
            extra={<Input.Search placeholder="Search sessions" allowClear value={search} onChange={(event) => setSearch(event.target.value)} style={{ width: 240 }} />}
          >
            <Table
              rowKey="id"
              loading={sessionsQuery.isLoading}
              dataSource={sessions}
              columns={columns}
              pagination={false}
              rowSelection={{
                type: 'radio',
                selectedRowKeys: effectiveSelectedSessionId ? [effectiveSelectedSessionId] : [],
                onChange: (keys) => setSelectedSessionId(keys[0] as string),
              }}
              onRow={(record) => ({ onClick: () => setSelectedSessionId(record.id) })}
            />
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card className="glass-panel qwen-section-card" title="Transcript viewer">
            {selectedSession ? (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <div>
                  <Typography.Text strong>{selectedSession.title}</Typography.Text>
                  <br />
                  <Typography.Text type="secondary">{selectedSession.id}</Typography.Text>
                </div>
                <Typography.Text type="secondary">
                  {selectedSession.source} · {selectedSession.messageCount} messages · updated {new Date(selectedSession.updatedAt).toLocaleString()}
                </Typography.Text>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {transcriptLines.map((message, index) => (
                    <Card key={`${message.role}-${index}`} size="small">
                      <Typography.Text strong>{message.role}</Typography.Text>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
                    </Card>
                  ))}
                </Space>
              </Space>
            ) : (
              <Typography.Text type="secondary">Select a session to inspect transcript details.</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
