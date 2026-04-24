import { Card, Col, List, Row, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import { useProfileStore } from '../store/profileStore'
import type { ToolRecord, ToolsetRecord } from '../types'

const toolsetColumns: ColumnsType<ToolsetRecord> = [
  { title: 'Toolset', dataIndex: 'name' },
  { title: 'Source', dataIndex: 'source', render: (value: ToolsetRecord['source']) => <Tag color={value === 'mcp' ? 'purple' : 'blue'}>{value}</Tag> },
  { title: 'Status', dataIndex: 'enabled', render: (value: boolean) => <Tag color={value ? 'green' : 'default'}>{value ? 'Enabled' : 'Disabled'}</Tag> },
  { title: 'Tools', dataIndex: 'toolCount' },
]

const toolColumns: ColumnsType<ToolRecord> = [
  { title: 'Tool', dataIndex: 'name' },
  { title: 'Toolset', dataIndex: 'toolset' },
  { title: 'Source', dataIndex: 'sourceType', render: (value: ToolRecord['sourceType']) => <Tag color={value === 'mcp' ? 'purple' : 'blue'}>{value}</Tag> },
  { title: 'Availability', dataIndex: 'available', render: (value: boolean) => <Tag color={value ? 'green' : 'red'}>{value ? 'Available' : 'Unavailable'}</Tag> },
]

export function ToolsPage() {
  const { selectedProfileId } = useProfileStore()
  const profileId = selectedProfileId ?? 'default'
  const toolsetsQuery = useApiQuery<ToolsetRecord[]>(() => apiClient.getAgentToolsets(profileId), [profileId])
  const toolsQuery = useApiQuery<ToolRecord[]>(() => apiClient.getAgentTools(profileId), [profileId])

  const isMock = toolsetsQuery.isMock || toolsQuery.isMock
  const error = toolsetsQuery.error ?? toolsQuery.error
  const mcpTools = (toolsQuery.data ?? []).filter((tool) => tool.sourceType === 'mcp')

  return (
    <div className="page-stack">
      <PageHeader
        title="Tools & Toolsets"
        description="Inspect profile-scoped toolsets, expanded tools, and MCP-injected capabilities."
        mock={isMock}
        error={error}
        onRefresh={async () => {
          await toolsetsQuery.refresh()
          await toolsQuery.refresh()
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
            <span className="qwen-summary-label">Enabled toolsets</span>
            <Typography.Title level={3}>{toolsetsQuery.data?.length ?? 0}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Resolved tools</span>
            <Typography.Title level={3}>{toolsQuery.data?.length ?? 0}</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card className="glass-panel qwen-section-card" title="Toolsets" loading={toolsetsQuery.isLoading}>
            <Table rowKey="name" columns={toolsetColumns} dataSource={toolsetsQuery.data ?? []} pagination={false} />
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card className="glass-panel qwen-section-card" title="Resolved tools" loading={toolsQuery.isLoading}>
            <Table rowKey="name" columns={toolColumns} dataSource={toolsQuery.data ?? []} pagination={false} expandable={{ expandedRowRender: (record) => <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(record.schemaSummary, null, 2)}</pre> }} />
          </Card>
        </Col>
      </Row>

      <Card className="glass-panel qwen-section-card" title="MCP surfaced tools" loading={toolsQuery.isLoading}>
        <List
          dataSource={mcpTools}
          locale={{ emptyText: 'No MCP tools resolved for this profile.' }}
          renderItem={(tool) => (
            <List.Item>
              <List.Item.Meta
                title={tool.name}
                description={
                  <Space direction="vertical" size={4}>
                    <Typography.Text>{tool.availabilityReason ?? 'No availability note.'}</Typography.Text>
                    <Typography.Text type="secondary">Source: {tool.sourceId ?? tool.toolset}</Typography.Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  )
}
