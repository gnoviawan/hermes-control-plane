import { Alert, Card, Col, List, Row, Skeleton, Space, Statistic, Typography } from 'antd'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'

export function OverviewPage() {
  const { data, isLoading, isMock, error, refresh } = useApiQuery(apiClient.getOverview, [])

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
        {(data?.metrics ?? Array.from({ length: 4 })).map((metric, index) => (
          <Col xs={24} md={12} xl={6} key={metric?.key ?? index}>
            <Card className="glass-panel metric-card">
              {isLoading || !metric ? (
                <Skeleton active paragraph={{ rows: 2 }} title={false} />
              ) : (
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  <Statistic title={metric.label} value={metric.value} />
                  <Typography.Text type="secondary">{metric.helper}</Typography.Text>
                  <StatusBadge status={metric.status} text={metric.status} />
                </Space>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card className="glass-panel" title="Recent activity">
            {isLoading ? (
              <Skeleton active paragraph={{ rows: 5 }} title={false} />
            ) : (
              <List
                dataSource={data?.activity ?? []}
                renderItem={(item) => (
                  <List.Item>
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
        <Col xs={24} xl={10}>
          <Card className="glass-panel" title="Alerts & rollout notes">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 4 }} title={false} />
              ) : (
                data?.alerts.map((alert) => (
                  <Alert
                    key={alert.title}
                    type={alert.severity}
                    showIcon
                    message={alert.title}
                    description={alert.detail}
                  />
                ))
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
