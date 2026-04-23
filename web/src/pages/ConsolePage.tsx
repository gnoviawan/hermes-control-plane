import { Card, Col, Empty, List, Row, Skeleton, Space, Tag, Typography } from 'antd'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import { useProfileStore } from '../store/profileStore'

const statusColors: Record<string, string> = {
  queued: 'gold',
  running: 'blue',
  completed: 'green',
  failed: 'red',
  stopped: 'default',
}

export function ConsolePage() {
  const { selectedProfileId } = useProfileStore()
  const profileId = selectedProfileId ?? 'default'
  const { data, isLoading, isMock, error, refresh } = useApiQuery(() => apiClient.getRuns(profileId), [profileId])
  const runs = data ?? []

  return (
    <div className="page-stack">
      <PageHeader
        title="Console"
        description="Initial run lifecycle cockpit for queued and in-flight Hermes runs with reconnectable stream links."
        mock={isMock}
        error={error}
        onRefresh={refresh}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card className="glass-panel qwen-section-card" title="Runs">
            {isLoading ? (
              <Skeleton active paragraph={{ rows: 5 }} title={false} />
            ) : runs.length ? (
              <List
                dataSource={runs}
                renderItem={(run) => (
                  <List.Item className="qwen-list-item">
                    <List.Item.Meta
                      title={
                        <Space wrap>
                          <Typography.Text strong>{run.id}</Typography.Text>
                          <Tag color={statusColors[run.status] ?? 'default'}>{run.status}</Tag>
                          <Typography.Text type="secondary">{run.provider} · {run.model}</Typography.Text>
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={4}>
                          <Typography.Text>{run.summary}</Typography.Text>
                          <Typography.Text type="secondary">Session: {run.sessionId ?? 'unassigned'}</Typography.Text>
                          <Typography.Text type="secondary">Started: {run.startedAt}</Typography.Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No runs yet for this profile." />
            )}
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card className="glass-panel qwen-section-card" title="Stream contract">
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 3 }} title={false} />
              ) : runs[0] ? (
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Typography.Text strong>Latest run</Typography.Text>
                  <Typography.Text code>{runs[0].streamUrl}</Typography.Text>
                  <Typography.Text code>{runs[0].eventsUrl}</Typography.Text>
                  <Typography.Text type="secondary">
                    SSE-first contract is live for reconnectable run snapshots while richer live console streaming lands in later slices.
                  </Typography.Text>
                </Space>
              ) : (
                <Typography.Text type="secondary">Create a run through the API to see stream endpoints here.</Typography.Text>
              )}
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  )
}
