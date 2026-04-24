import { Card, Col, List, Row, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo } from 'react'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import { useProfileStore } from '../store/profileStore'
import type { AgentEnvRecord, ModelCatalogRecord, ProviderCatalogRecord, ProviderRoutingRecord, SystemEnvCatalogRecord } from '../types'

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

type ProviderReadinessRow = {
  name: string
  hasCredentials: boolean
  credentialSource: string
  authCoverage: string
  envBackedKeys: string[]
}

const providerKeyHints: Record<string, string[]> = {
  openai: ['OPENAI_API_KEY'],
  anthropic: ['ANTHROPIC_API_KEY'],
  custom: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'],
}

export function ProvidersPage() {
  const { selectedProfileId } = useProfileStore()
  const profileId = selectedProfileId ?? 'default'

  const providersQuery = useApiQuery<ProviderCatalogRecord[]>(apiClient.getProviders, [])
  const modelsQuery = useApiQuery<ModelCatalogRecord[]>(apiClient.getModels, [])
  const routingQuery = useApiQuery<ProviderRoutingRecord>(apiClient.getProviderRouting, [])
  const systemEnvCatalog = useApiQuery<SystemEnvCatalogRecord>(() => apiClient.getSystemEnvCatalog(), ['providers-env-catalog'])
  const agentEnvState = useApiQuery<AgentEnvRecord>(() => apiClient.getAgentEnv(profileId), [profileId, 'providers-agent-env'])

  const isMock = providersQuery.isMock || modelsQuery.isMock || routingQuery.isMock || systemEnvCatalog.isMock || agentEnvState.isMock
  const error = providersQuery.error ?? modelsQuery.error ?? routingQuery.error ?? systemEnvCatalog.error ?? agentEnvState.error

  const providerReadinessRows = useMemo<ProviderReadinessRow[]>(() => {
    const envCatalogKeys = new Set((systemEnvCatalog.data?.categories ?? []).flatMap((category) => category.variables.map((variable) => variable.key)))
    const liveEnvMap = new Map((agentEnvState.data?.variables ?? []).map((variable) => [variable.key, variable]))

    return (providersQuery.data ?? []).map((provider) => {
      const envBackedKeys = (providerKeyHints[provider.name] ?? []).filter((key) => envCatalogKeys.has(key))
      const configuredEnvKeys = envBackedKeys.filter((key) => liveEnvMap.get(key)?.isSet)
      const credentialSource = provider.hasCredentials ? 'config' : configuredEnvKeys.length > 0 ? 'env' : 'missing'
      const authCoverage = provider.hasCredentials || configuredEnvKeys.length > 0 ? 'ready' : 'missing'

      return {
        name: provider.name,
        hasCredentials: provider.hasCredentials,
        credentialSource,
        authCoverage,
        envBackedKeys,
      }
    })
  }, [agentEnvState.data?.variables, providersQuery.data, systemEnvCatalog.data?.categories])

  return (
    <div className="page-stack">
      <PageHeader
        title="Providers & Models"
        description="Inspect provider catalogs, model availability, default routing, fallback chains, and provider auth readiness with secret redaction."
        mock={isMock}
        error={error}
        onRefresh={async () => {
          await providersQuery.refresh()
          await modelsQuery.refresh()
          await routingQuery.refresh()
          await systemEnvCatalog.refresh()
          await agentEnvState.refresh()
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

      <Card className="glass-panel qwen-section-card" title="Provider auth readiness" loading={providersQuery.isLoading || systemEnvCatalog.isLoading || agentEnvState.isLoading}>
        <List
          dataSource={providerReadinessRows}
          renderItem={(item) => (
            <List.Item>
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                <Space wrap>
                  <Typography.Text strong>{item.name}</Typography.Text>
                  <Tag color={item.authCoverage === 'ready' ? 'green' : 'red'}>Auth coverage: {item.authCoverage}</Tag>
                  <Tag>Credential source: {item.credentialSource}</Tag>
                </Space>
                <Typography.Text type="secondary">Env-backed keys</Typography.Text>
                <Space wrap>
                  {item.envBackedKeys.length > 0 ? item.envBackedKeys.map((key) => <Tag key={key}>{key}</Tag>) : <Tag>none</Tag>}
                </Space>
              </Space>
            </List.Item>
          )}
        />
      </Card>

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
