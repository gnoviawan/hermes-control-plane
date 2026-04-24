import { Button, Card, Col, List, Row, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import { useProfileStore } from '../store/profileStore'
import type { McpServerRecord, ToolRecord } from '../types'

const serverColumns: ColumnsType<McpServerRecord> = [
  { title: 'Server', dataIndex: 'name' },
  { title: 'Transport', dataIndex: 'transport', render: (value) => <Tag color={value === 'http' ? 'cyan' : 'purple'}>{value}</Tag> },
  { title: 'Connection', dataIndex: 'connectionState', render: (value) => <Tag color={value === 'connected' ? 'green' : value === 'disconnected' ? 'default' : 'gold'}>{value}</Tag> },
  { title: 'Auth', dataIndex: 'authState', render: (value) => <Tag>{value}</Tag> },
  { title: 'Discovered tools', dataIndex: 'discoveredToolsCount' },
]

const toolColumns: ColumnsType<ToolRecord> = [
  { title: 'Injected tool', dataIndex: 'name' },
  { title: 'Server', dataIndex: 'sourceId' },
  { title: 'Availability', dataIndex: 'available', render: (value: boolean) => <Tag color={value ? 'green' : 'red'}>{value ? 'Available' : 'Unavailable'}</Tag> },
]

export function McpPage() {
  const { selectedProfileId } = useProfileStore()
  const profileId = selectedProfileId ?? 'default'
  const serversQuery = useApiQuery<McpServerRecord[]>(() => apiClient.getAgentMcpServers(profileId), [profileId])
  const toolsQuery = useApiQuery<ToolRecord[]>(() => apiClient.getAgentMcpTools(profileId), [profileId])
  const systemQuery = useApiQuery<McpServerRecord[]>(apiClient.getSystemMcpServers, [])

  const isMock = serversQuery.isMock || toolsQuery.isMock || systemQuery.isMock
  const error = serversQuery.error ?? toolsQuery.error ?? systemQuery.error

  const handleReload = async () => {
    const result = await apiClient.reloadAgentMcpServers(profileId)
    message.success(`${result.data.message}${result.mock ? ' (mocked)' : ''}`)
    await serversQuery.refresh()
    await toolsQuery.refresh()
    await systemQuery.refresh()
  }

  const handleToggleConnection = async (server: McpServerRecord) => {
    const nextConnected = server.connectionState !== 'connected'
    const result = await apiClient.setAgentMcpConnection(profileId, server.id, nextConnected)
    message.success(`${result.data.name} ${nextConnected ? 'connected' : 'disconnected'}${result.mock ? ' (mocked)' : ''}.`)
    await serversQuery.refresh()
    await systemQuery.refresh()
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="MCP"
        description="Inspect profile-scoped MCP server registry, connection state, and injected tool visibility through the dashboard adapter boundary."
        mock={isMock}
        error={error}
        onRefresh={async () => {
          await serversQuery.refresh()
          await toolsQuery.refresh()
          await systemQuery.refresh()
        }}
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
            <span className="qwen-summary-label">Configured servers</span>
            <Typography.Title level={3}>{serversQuery.data?.length ?? 0}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Injected MCP tools</span>
            <Typography.Title level={3}>{toolsQuery.data?.length ?? 0}</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Card className="glass-panel qwen-context-strip">
        <Space align="center" wrap>
          <Typography.Text strong>Reload discovery registry for {profileId}</Typography.Text>
          <Button onClick={() => void handleReload()}>Reload MCP</Button>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card className="glass-panel qwen-section-card" title="Profile MCP servers" loading={serversQuery.isLoading}>
            <Table
              rowKey="id"
              columns={serverColumns}
              dataSource={serversQuery.data ?? []}
              pagination={false}
              expandable={{
                expandedRowRender: (record) => (
                  <Space direction="vertical" size={6}>
                    <Typography.Text>Profiles: {record.profiles.join(', ') || '—'}</Typography.Text>
                    <Typography.Text>Last reload: {record.lastReloadAt ?? '—'}</Typography.Text>
                    <Typography.Text>Sampling enabled: {record.samplingEnabled ? 'yes' : 'no'}</Typography.Text>
                    <Button size="small" onClick={() => void handleToggleConnection(record)}>
                      {record.connectionState === 'connected' ? 'Disconnect' : 'Connect'}
                    </Button>
                  </Space>
                ),
              }}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card className="glass-panel qwen-section-card" title="Injected MCP tools" loading={toolsQuery.isLoading}>
            <Table rowKey="name" columns={toolColumns} dataSource={toolsQuery.data ?? []} pagination={false} />
          </Card>
        </Col>
      </Row>

      <Card className="glass-panel qwen-section-card" title="System MCP registry" loading={systemQuery.isLoading}>
        <List
          dataSource={systemQuery.data ?? []}
          renderItem={(server) => (
            <List.Item>
              <List.Item.Meta
                title={`${server.name} · ${server.transport}`}
                description={
                  <Space direction="vertical" size={4}>
                    <Typography.Text>Profiles: {server.profiles.join(', ') || '—'}</Typography.Text>
                    <Typography.Text type="secondary">Connection: {server.connectionState} · Auth: {server.authState}</Typography.Text>
                  </Space>
                }
              />
              <Tag>{server.discoveredToolsCount} tools</Tag>
            </List.Item>
          )}
        />
      </Card>
    </div>
  )
}
