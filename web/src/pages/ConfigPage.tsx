import { Card, Col, Input, List, Row, Select, Space, Switch, Tag, Typography } from 'antd'
import { useMemo } from 'react'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import { useProfileStore } from '../store/profileStore'
import type { AgentConfigFieldRecord, AgentConfigRecord, AgentConfigSchemaRecord } from '../types'

const statusColorMap: Record<AgentConfigFieldRecord['status'], string> = {
  editable: 'blue',
  deferred: 'gold',
  forbidden: 'red',
}

const renderFieldControl = (field: AgentConfigFieldRecord) => {
  const disabled = field.status !== 'editable'

  if (field.type === 'boolean') {
    return <Switch checked={Boolean(field.value)} disabled />
  }

  if (field.options.length > 0) {
    return <Select value={String(field.value ?? '')} options={field.options.map((option) => ({ value: option, label: option }))} disabled={disabled} style={{ width: '100%' }} />
  }

  return <Input value={field.value == null ? '' : String(field.value)} disabled={disabled} />
}

export function ConfigPage() {
  const { selectedProfileId } = useProfileStore()
  const profileId = selectedProfileId ?? 'default'
  const {
    data,
    isLoading,
    isMock,
    error,
    refresh,
  } = useApiQuery<AgentConfigRecord>(() => apiClient.getAgentConfig(profileId), [profileId])
  const {
    data: schema,
    isLoading: schemaLoading,
    isMock: schemaMock,
    error: schemaError,
    refresh: refreshSchema,
  } = useApiQuery<AgentConfigSchemaRecord>(() => apiClient.getAgentConfigSchema(profileId), [profileId, 'schema'])

  const effectiveMock = isMock || schemaMock
  const effectiveError = error ?? schemaError

  const summaryStats = useMemo(
    () => [
      { label: 'Editable', value: schema?.editableCount ?? data?.editableFields.length ?? 0 },
      { label: 'Deferred', value: schema?.deferredCount ?? data?.deferredFields.length ?? 0 },
      { label: 'Forbidden', value: schema?.forbiddenCount ?? 0 },
    ],
    [data?.deferredFields.length, data?.editableFields.length, schema?.deferredCount, schema?.editableCount, schema?.forbiddenCount],
  )

  return (
    <div className="page-stack">
      <PageHeader
        title="Config"
        description="Schema-driven config editor skeleton for the active Hermes profile, with grouped sections, field badges, and raw debug surfaces."
        mock={effectiveMock}
        error={effectiveError}
        onRefresh={() => {
          refresh()
          refreshSchema()
        }}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card" loading={isLoading || schemaLoading}>
            <span className="qwen-summary-label">Profile</span>
            <Typography.Title level={3}>{schema?.agentId ?? data?.agentId ?? profileId}</Typography.Title>
            <Typography.Text type="secondary">{schema?.path ?? data?.path ?? 'Config path unavailable'}</Typography.Text>
          </Card>
        </Col>
        {summaryStats.map((item) => (
          <Col xs={24} md={8} key={item.label}>
            <Card className="glass-panel qwen-summary-card" loading={schemaLoading}>
              <span className="qwen-summary-label">{item.label}</span>
              <Typography.Title level={3}>{item.value}</Typography.Title>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card className="glass-panel qwen-section-card" title="Editable schema" loading={schemaLoading}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              {(schema?.sections ?? []).map((section) => (
                <Card key={section.key} type="inner" title={section.label}>
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {section.fields.map((field) => (
                      <div key={field.key}>
                        <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
                          <div>
                            <Typography.Text strong>{field.label}</Typography.Text>
                            <div>
                              <Typography.Text type="secondary">{field.key}</Typography.Text>
                            </div>
                          </div>
                          <Space wrap>
                            <Tag color={statusColorMap[field.status]}>{field.status}</Tag>
                            <Tag>{field.impact}</Tag>
                            <Tag>{field.type}</Tag>
                          </Space>
                        </Space>
                        <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 12 }}>
                          {field.description}
                        </Typography.Paragraph>
                        {renderFieldControl(field)}
                      </div>
                    ))}
                  </Space>
                </Card>
              ))}
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card className="glass-panel qwen-section-card" title="Deferred schema" loading={schemaLoading}>
              <List
                size="small"
                dataSource={schema?.deferredFields ?? []}
                renderItem={(field) => (
                  <List.Item>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Space wrap>
                        <Typography.Text strong>{field.label}</Typography.Text>
                        <Tag color={statusColorMap[field.status]}>{field.status}</Tag>
                        <Tag>{field.impact}</Tag>
                      </Space>
                      <Typography.Text type="secondary">{field.key}</Typography.Text>
                      <Typography.Text type="secondary">{field.description}</Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
            </Card>

            <Card className="glass-panel qwen-section-card" title="Write restrictions" loading={isLoading}>
              <List size="small" dataSource={data?.writeRestrictions ?? []} renderItem={(item) => <List.Item>{item}</List.Item>} />
            </Card>
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card className="glass-panel qwen-section-card" title="Raw effective config" loading={isLoading}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(data?.effectiveConfig ?? {}, null, 2)}</pre>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card className="glass-panel qwen-section-card" title="Raw profile overrides" loading={isLoading}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(data?.profileOverrides ?? {}, null, 2)}</pre>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
