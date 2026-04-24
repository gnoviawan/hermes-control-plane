import { Card, Col, List, Row, Space, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import type { DashboardPluginRecord } from '../types'

function renderKindColor(kind: DashboardPluginRecord['extensions'][number]['kind']): string {
  if (kind === 'page_route') return 'blue'
  if (kind === 'dashboard_widget') return 'green'
  return 'purple'
}

export function PluginsPage() {
  const pluginsQuery = useApiQuery(apiClient.getSystemPlugins, [])

  return (
    <div className="page-stack">
      <PageHeader
        title="Plugin Slots"
        description="Review explicit extension slots, registered plugins, and plugin-owned routes/widgets/renderers without patching core dashboard code."
        mock={pluginsQuery.isMock}
        error={pluginsQuery.error}
        onRefresh={pluginsQuery.refresh}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Supported slot types</span>
            <Typography.Title level={3}>{pluginsQuery.data?.supportedSlots.length ?? 0}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Registered plugins</span>
            <Typography.Title level={3}>{pluginsQuery.data?.totalPlugins ?? 0}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Enabled extensions</span>
            <Typography.Title level={3}>
              {(pluginsQuery.data?.plugins ?? []).flatMap((plugin) => plugin.extensions).length}
            </Typography.Title>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8}>
          <Card className="glass-panel qwen-section-card" title="Supported slots" loading={pluginsQuery.isLoading}>
            <List
              dataSource={pluginsQuery.data?.supportedSlots ?? []}
              renderItem={(slot) => (
                <List.Item>
                  <Space direction="vertical" size={2}>
                    <Typography.Text strong>{slot.title}</Typography.Text>
                    <Typography.Text code>{slot.kind}</Typography.Text>
                    <Typography.Text type="secondary">{slot.description}</Typography.Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} xl={16}>
          <Card className="glass-panel qwen-section-card" title="Registered plugins" loading={pluginsQuery.isLoading}>
            <List
              dataSource={pluginsQuery.data?.plugins ?? []}
              renderItem={(plugin) => (
                <List.Item>
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <Space wrap>
                      <Typography.Text strong>{plugin.name}</Typography.Text>
                      <Tag color={plugin.enabled ? 'green' : 'default'}>{plugin.enabled ? 'enabled' : 'disabled'}</Tag>
                      <Tag>{plugin.source}</Tag>
                      <Tag>{plugin.version}</Tag>
                    </Space>
                    <Typography.Text type="secondary">{plugin.description}</Typography.Text>
                    <Space wrap>
                      {plugin.extensions.map((extension) =>
                        extension.kind === 'page_route' && extension.path ? (
                          <Link key={`${plugin.id}-${extension.key}`} to={extension.path}>
                            <Tag color={renderKindColor(extension.kind)}>{extension.title}</Tag>
                          </Link>
                        ) : (
                          <Tag key={`${plugin.id}-${extension.key}`} color={renderKindColor(extension.kind)}>
                            {extension.title}
                          </Tag>
                        ),
                      )}
                    </Space>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
