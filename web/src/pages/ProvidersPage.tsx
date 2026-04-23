import { Card, Col, List, Row, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import type { ModelCatalogRecord, ProviderCatalogRecord, ProviderRoutingRecord } from '../types'

const providerColumns: ColumnsType<ProviderCatalogRecord> = [
  { title: 'Provider', dataIndex: 'name' },
  { title: 'Source', dataIndex: 'source' },
  { title: 'Credentials', dataIndex: 'hasCredentials', render: (value: boolean) => <Tag color={value ? 'green' : 'default'}>{value ? 'Configured' : 'Missing'}</Tag> },
]

const modelColumns: ColumnsType<ModelCatalogRecord> = [
  { title: 'Model', dataIndex: 'id' },
  { title: 'Provider', dataIndex: 'provider' },
  { title: 'Source', dataIndex: 'source' },
]

export function ProvidersPage() {
  const providersQuery = useApiQuery<ProviderCatalogRecord[]>(apiClient.getProviders, [])
  const modelsQuery = useApiQuery<ModelCatalogRecord[]>(apiClient.getModels, [])
  const routingQuery = useApiQuery<ProviderRoutingRecord>(apiClient.getProviderRouting, [])

  const isMock = providersQuery.isMock || modelsQuery.isMock || routingQuery.isMock
  const error = providersQuery.error ?? modelsQuery.error ?? routingQuery.error

  return (
    <div className="page-stack">
      <PageHeader
        title="Providers & Models"
        description="Inspect provider catalogs, model availability, default routing, and fallback chains with secret redaction."
        mock={isMock}
        error={error}
        onRefresh={async () => {
          await providersQuery.refresh()
          await modelsQuery.refresh()
          await routingQuery.refresh()
        }}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Providers</span>
            <Typography.Title level={3}>{providersQuery.data?.length ?? 0}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Models</span>
            <Typography.Title level={3}>{modelsQuery.data?.length ?? 0}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Effective providers</span>
            <Typography.Title level={3}>{routingQuery.data?.effectiveProviderCount ?? 0}</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card className="glass-panel qwen-section-card" title="Provider catalog" loading={providersQuery.isLoading}>
            <Table rowKey="name" dataSource={providersQuery.data ?? []} columns={providerColumns} pagination={false} />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card className="glass-panel qwen-section-card" title="Model catalog" loading={modelsQuery.isLoading}>
            <Table rowKey={(record) => `${record.provider}:${record.id}`} dataSource={modelsQuery.data ?? []} columns={modelColumns} pagination={false} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card className="glass-panel qwen-section-card" title="Routing summary" loading={routingQuery.isLoading}>
            <Space direction="vertical" size={10}>
              <Typography.Text>Default provider: <Typography.Text strong>{routingQuery.data?.defaultProvider ?? '—'}</Typography.Text></Typography.Text>
              <Typography.Text>Default model: <Typography.Text strong>{routingQuery.data?.defaultModel ?? '—'}</Typography.Text></Typography.Text>
              <Typography.Text>Fallbacks:</Typography.Text>
              <Space wrap>
                {(routingQuery.data?.fallbackProviders ?? []).map((provider) => <Tag key={provider} color="gold">{provider}</Tag>)}
              </Space>
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card className="glass-panel qwen-section-card" title="Provider configs (redacted)" loading={providersQuery.isLoading}>
            <List
              dataSource={providersQuery.data ?? []}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.name}
                    description={<pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(item.config, null, 2)}</pre>}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Card className="glass-panel qwen-section-card" title="Write restrictions" loading={routingQuery.isLoading}>
        <List
          size="small"
          dataSource={routingQuery.data?.writeRestrictions ?? []}
          renderItem={(item) => <List.Item>{item}</List.Item>}
        />
      </Card>
    </div>
  )
}
