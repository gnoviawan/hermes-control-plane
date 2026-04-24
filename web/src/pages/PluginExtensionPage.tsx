import { Alert, Card, Empty, List, Space, Tag, Typography } from 'antd'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'

export function PluginExtensionPage() {
  const { pluginId, extensionKey } = useParams<{ pluginId: string; extensionKey: string }>()
  const pluginsQuery = useApiQuery(apiClient.getSystemPlugins, [])

  const extension = useMemo(() => {
    const plugin = (pluginsQuery.data?.plugins ?? []).find((item) => item.id === pluginId)
    const selectedExtension = plugin?.extensions.find((item) => item.key === extensionKey)
    return plugin && selectedExtension ? { plugin, extension: selectedExtension } : null
  }, [extensionKey, pluginId, pluginsQuery.data])

  return (
    <div className="page-stack">
      <PageHeader
        title={extension?.extension.title ?? 'Plugin extension'}
        description="Generic route shell for plugin-owned dashboard pages in Plugin slots v1."
        mock={pluginsQuery.isMock}
        error={pluginsQuery.error}
        onRefresh={pluginsQuery.refresh}
      />

      {!extension ? (
        <Card className="glass-panel qwen-section-card">
          <Empty description="Plugin extension not found" />
        </Card>
      ) : (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card className="glass-panel qwen-section-card" title="Extension metadata">
            <Space direction="vertical" size={8}>
              <Space wrap>
                <Typography.Text strong>{extension.plugin.name}</Typography.Text>
                <Tag>{extension.plugin.version}</Tag>
                <Tag color={extension.plugin.enabled ? 'green' : 'default'}>{extension.plugin.enabled ? 'enabled' : 'disabled'}</Tag>
                <Tag color="blue">{extension.extension.kind}</Tag>
              </Space>
              <Typography.Text type="secondary">{extension.extension.description}</Typography.Text>
              <Typography.Text>Target slot: {extension.extension.target}</Typography.Text>
              {extension.extension.path ? <Typography.Text>Route path: {extension.extension.path}</Typography.Text> : null}
            </Space>
          </Card>

          <Alert
            type="info"
            showIcon
            message="Plugin route shell active"
            description="Plugin slots v1 provides an explicit, non-monkey-patched route shell. Rich plugin-owned rendering can evolve behind this stable contract in later phases."
          />

          <Card className="glass-panel qwen-section-card" title="Sibling extensions">
            <List
              dataSource={extension.plugin.extensions}
              renderItem={(item) => (
                <List.Item>
                  <Space>
                    <Typography.Text strong>{item.title}</Typography.Text>
                    <Tag>{item.kind}</Tag>
                    <Typography.Text type="secondary">{item.target}</Typography.Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Space>
      )}
    </div>
  )
}
