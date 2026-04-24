import { Button, Card, Col, List, Row, Space, Switch, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo } from 'react'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import type { GatewayPlatformRecord, SystemGatewayRecord } from '../types'

const platformColumns: ColumnsType<GatewayPlatformRecord> = [
  { title: 'Platform', dataIndex: 'name' },
  { title: 'Enabled', dataIndex: 'enabled', render: (value) => <Tag color={value ? 'green' : 'default'}>{value ? 'enabled' : 'disabled'}</Tag> },
  { title: 'Status', dataIndex: 'status', render: (value) => <Tag color={value === 'running' ? 'green' : value === 'disabled' ? 'default' : 'gold'}>{value}</Tag> },
  { title: 'Channels', dataIndex: 'channelCount' },
  {
    title: 'Config',
    dataIndex: 'config',
    render: (value: Record<string, unknown>) => (
      <Typography.Text type="secondary" style={{ whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(value, null, 2)}
      </Typography.Text>
    ),
  },
]

export function GatewayPage() {
  const gatewayQuery = useApiQuery<SystemGatewayRecord>(apiClient.getSystemGateway, [])
  const platformsQuery = useApiQuery<GatewayPlatformRecord[]>(apiClient.getSystemGatewayPlatforms, [])

  const isMock = gatewayQuery.isMock || platformsQuery.isMock
  const error = gatewayQuery.error ?? platformsQuery.error

  const refreshAll = async () => {
    await gatewayQuery.refresh()
    await platformsQuery.refresh()
  }

  const platformPatchPayload = useMemo(() => {
    const payload: Record<string, { enabled: boolean; channels: string[] }> = {}
    for (const platform of platformsQuery.data ?? []) {
      const rawChannels = Array.isArray(platform.config?.channels) ? platform.config.channels : []
      payload[platform.name] = {
        enabled: platform.enabled,
        channels: rawChannels.map((value) => String(value)),
      }
    }
    return payload
  }, [platformsQuery.data])

  const handleToggleGateway = async (enabled: boolean) => {
    const result = await apiClient.patchSystemGateway({
      enabled,
      defaultPlatform: gatewayQuery.data?.defaultPlatform,
      platforms: platformPatchPayload,
    })
    message.success(`Gateway ${result.data.enabled ? 'enabled' : 'disabled'}${result.mock ? ' (mocked)' : ''}.`)
    await refreshAll()
  }

  const handleLifecycle = async (action: 'start' | 'stop') => {
    const result = await apiClient.setSystemGatewayLifecycle(action)
    message.success(`${result.data.message}${result.mock ? ' (mocked)' : ''}`)
    await refreshAll()
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Gateway & Channels"
        description="Manage system-wide gateway connectivity, platform channel bindings, and lifecycle controls through stable dashboard contracts."
        mock={isMock}
        error={error}
        onRefresh={refreshAll}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Gateway status</span>
            <Typography.Title level={3}>{gatewayQuery.data?.status ?? 'unknown'}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Platforms</span>
            <Typography.Title level={3}>{gatewayQuery.data?.platformCount ?? 0}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Channels</span>
            <Typography.Title level={3}>{gatewayQuery.data?.channelCount ?? 0}</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card className="glass-panel qwen-section-card" title="Gateway controls" loading={gatewayQuery.isLoading}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Space align="center">
                <Typography.Text strong>Enabled</Typography.Text>
                <Switch checked={gatewayQuery.data?.enabled ?? false} onChange={(checked) => void handleToggleGateway(checked)} />
              </Space>
              <Space>
                <Button type="primary" onClick={() => void handleLifecycle('start')}>
                  Start gateway
                </Button>
                <Button onClick={() => void handleLifecycle('stop')}>Stop gateway</Button>
              </Space>
              <div>
                <Typography.Text type="secondary">Default platform</Typography.Text>
                <div>{gatewayQuery.data?.defaultPlatform ?? '—'}</div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card className="glass-panel qwen-section-card" title="Write restrictions" loading={gatewayQuery.isLoading}>
            <List
              dataSource={gatewayQuery.data?.writeRestrictions ?? []}
              renderItem={(item) => <List.Item>{item}</List.Item>}
            />
          </Card>
        </Col>
      </Row>

      <Card className="glass-panel qwen-section-card" title="Platform bindings" loading={platformsQuery.isLoading}>
        <Table rowKey="name" columns={platformColumns} dataSource={platformsQuery.data ?? []} pagination={false} />
      </Card>
    </div>
  )
}
