import { Alert, Card, Col, List, Row, Skeleton, Space, Typography } from 'antd'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import type { OverviewMetric, PluginExtensionRecord } from '../types'

export function OverviewPage() {
  const { data, isLoading, isMock, error, refresh } = useApiQuery(apiClient.getOverview, [])
  const pluginsQuery = useApiQuery(apiClient.getSystemPlugins, [])
  const metrics = data?.metrics ?? []
  const activity = data?.activity ?? []
  const alerts = data?.alerts ?? []
  const pluginWidgets: PluginExtensionRecord[] = (pluginsQuery.data?.plugins ?? [])
    .flatMap((plugin) => plugin.extensions)
    .filter((extension) => extension.kind === 'dashboard_widget')
  const metricPlaceholders: OverviewMetric[] = Array.from({ length: 4 }, (_, index) => ({
    key: `placeholder-${index}`,
    label: '',
    value: '',
    helper: '',
    status: 'idle',
  }))

  return (
    <div className="page-stack">
      <PageHeader
        title="Overview"
        description="At-a-glance health, recent activity, and rollout signals across the Hermes control plane."
        mock={isMock}
        error={error}
        onRefresh={refresh}
      />

      <Row gutter={[16, 16]}>
        {(metrics.length ? metrics : metricPlaceholders).map((metric, index) => (
          <Col xs={24} md={12} xl={6} key={metric?.key ?? index}>
            <Card className="glass-panel metric-card qwen-stat-card">
              {isLoading || !metric ? (
                <Skeleton active paragraph={{ rows: 2 }} title={false} />
              ) : (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <div className="qwen-stat-card-header">
                    <Typography.Text className="qwen-stat-card-label">{metric.label}</Typography.Text>
                    <StatusBadge status={metric.status} text={metric.status} />
                  </div>
                  <Typography.Title level={2} className="qwen-stat-card-value">
                    {String(metric.value)}
                  </Typography.Title>
                  <Typography.Text className="qwen-stat-card-helper">{metric.helper}</Typography.Text>
                </Space>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card className="glass-panel qwen-section-card" title="Recent activity">
            {isLoading ? (
              <Skeleton active paragraph={{ rows: 5 }} title={false} />
            ) : (
              <List
                dataSource={activity}
                locale={{ emptyText: 'No activity yet' }}
                renderItem={(item) => (
                  <List.Item className="qwen-list-item">
                    <List.Item.Meta
                      title={
                        <Space>
                          <Typography.Text strong>{item.title}</Typography.Text>
                          <StatusBadge status={item.status} />
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={2}>
                          <Typography.Text type="secondary">{item.detail}</Typography.Text>
                          <Typography.Text type="secondary">{item.timestamp}</Typography.Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card className="glass-panel qwen-section-card" title="Rollout snapshot">
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 3 }} title={false} />
              ) : (
                <div className="qwen-summary-grid">
                  <div className="qwen-summary-item">
                    <span className="qwen-summary-label">Signals</span>
                    <strong>{activity.length}</strong>
                  </div>
                  <div className="qwen-summary-item">
                    <span className="qwen-summary-label">Alerts</span>
                    <strong>{alerts.length}</strong>
                  </div>
                  <div className="qwen-summary-item">
                    <span className="qwen-summary-label">Healthy metrics</span>
                    <strong>{metrics.filter((metric) => metric.status === 'healthy').length}</strong>
                  </div>
                </div>
              )}
            </Card>

            <Card className="glass-panel qwen-section-card" title="Alerts & rollout notes">
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {isLoading ? (
                  <Skeleton active paragraph={{ rows: 4 }} title={false} />
                ) : alerts.length ? (
                  alerts.map((alert) => (
                    <Alert
                      key={alert.title}
                      type={alert.severity}
                      showIcon
                      message={alert.title}
                      description={alert.detail}
                    />
                  ))
                ) : (
                  <Typography.Text type="secondary">No alerts currently blocking rollout.</Typography.Text>
                )}
              </Space>
            </Card>

            <Card className="glass-panel qwen-section-card" title="Plugin widgets">
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {pluginsQuery.isLoading ? (
                  <Skeleton active paragraph={{ rows: 3 }} title={false} />
                ) : pluginWidgets.length ? (
                  pluginWidgets.map((widget) => (
                    <Alert
                      key={widget.key}
                      type="info"
                      showIcon
                      message={widget.title}
                      description={`${widget.description} · target: ${widget.target}`}
                    />
                  ))
                ) : (
                  <Typography.Text type="secondary">No dashboard widgets registered yet.</Typography.Text>
                )}
              </Space>
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  )
}
