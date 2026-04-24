import { Alert, Button, Card, Col, Input, List, Row, Select, Space, Switch, Tag, Typography } from 'antd'
import { useState } from 'react'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import { useProfileStore } from '../store/profileStore'
import type {
  AgentConfigFieldRecord,
  AgentConfigRecord,
  AgentConfigSchemaRecord,
  AgentConfigValidationRecord,
} from '../types'

const statusColorMap: Record<AgentConfigFieldRecord['status'], string> = {
  editable: 'blue',
  deferred: 'gold',
  forbidden: 'red',
}

const setNestedValue = (target: Record<string, unknown>, dottedKey: string, value: unknown) => {
  const parts = dottedKey.split('.')
  let cursor: Record<string, unknown> = target

  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      cursor[part] = value
      return
    }

    if (typeof cursor[part] !== 'object' || cursor[part] === null || Array.isArray(cursor[part])) {
      cursor[part] = {}
    }

    cursor = cursor[part] as Record<string, unknown>
  })
}

const buildPatchPayload = (draftValues: Record<string, unknown>) => {
  const payload: Record<string, unknown> = {}
  Object.entries(draftValues).forEach(([key, value]) => setNestedValue(payload, key, value))
  return payload
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

  const [draftValues, setDraftValues] = useState<Record<string, unknown>>({})
  const [validationPreview, setValidationPreview] = useState<AgentConfigValidationRecord | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const effectiveMock = isMock || schemaMock
  const effectiveError = error ?? schemaError

  const pendingChanges = Object.entries(draftValues).map(([key, value]) => ({
    key,
    value,
  }))

  const summaryStats = [
    { label: 'Editable', value: schema?.editableCount ?? data?.editableFields.length ?? 0 },
    { label: 'Deferred', value: schema?.deferredCount ?? data?.deferredFields.length ?? 0 },
    { label: 'Forbidden', value: schema?.forbiddenCount ?? 0 },
  ]

  const setFieldValue = (fieldKey: string, value: unknown) => {
    setDraftValues((current) => ({ ...current, [fieldKey]: value }))
  }

  const getFieldValue = (field: AgentConfigFieldRecord) => (field.key in draftValues ? draftValues[field.key] : field.value)

  const runValidationPreview = async () => {
    const payload = buildPatchPayload(draftValues)
    const result = await apiClient.validateAgentConfig(profileId, payload)
    setValidationPreview(result.data)
    setActionMessage(result.mock ? 'Validation preview shown from fallback data.' : 'Validation preview updated.')
  }

  const saveChanges = async () => {
    const payload = buildPatchPayload(draftValues)
    setIsSubmitting(true)
    try {
      const validation = await apiClient.validateAgentConfig(profileId, payload)
      setValidationPreview(validation.data)

      if (!validation.data.valid) {
        setActionMessage('Validation blocked save. Fix the flagged config keys first.')
        return
      }

      await apiClient.patchAgentConfig(profileId, payload)
      setDraftValues({})
      setActionMessage('Config changes saved.')
      refresh()
      refreshSchema()
    } finally {
      setIsSubmitting(false)
    }
  }

  const reloadConfig = async () => {
    setIsSubmitting(true)
    try {
      const result = await apiClient.reloadAgentConfig(profileId)
      setActionMessage(result.data.message)
      refresh()
      refreshSchema()
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderFieldControl = (field: AgentConfigFieldRecord) => {
    const disabled = field.status !== 'editable'
    const currentValue = getFieldValue(field)

    if (field.type === 'boolean') {
      return <Switch checked={Boolean(currentValue)} disabled={disabled || isSubmitting} onChange={(checked) => setFieldValue(field.key, checked)} />
    }

    if (field.options.length > 0) {
      return (
        <Select
          value={String(currentValue ?? '')}
          options={field.options.map((option) => ({ value: option, label: option }))}
          disabled={disabled || isSubmitting}
          onChange={(value) => setFieldValue(field.key, value)}
          style={{ width: '100%' }}
        />
      )
    }

    return <Input value={currentValue == null ? '' : String(currentValue)} disabled={disabled || isSubmitting} onChange={(event) => setFieldValue(field.key, event.target.value)} />
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Config"
        description="Schema-driven config editor with validation preview, dirty-state tracking, save flow, and reload controls for the active Hermes profile."
        mock={effectiveMock}
        error={effectiveError}
        onRefresh={() => {
          refresh()
          refreshSchema()
        }}
      />

      {actionMessage ? <Alert type="info" showIcon message={actionMessage} /> : null}

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

      <Card
        className="glass-panel qwen-section-card"
        title="Validation preview"
        extra={
          <Space wrap>
            <Button onClick={() => { setDraftValues({}); setValidationPreview(null); setActionMessage('Discarded pending config changes.') }} disabled={pendingChanges.length === 0 || isSubmitting}>
              Discard changes
            </Button>
            <Button onClick={runValidationPreview} disabled={pendingChanges.length === 0 || isSubmitting}>
              Validate preview
            </Button>
            <Button type="primary" onClick={saveChanges} disabled={pendingChanges.length === 0 || isSubmitting} loading={isSubmitting}>
              Save changes
            </Button>
            <Button onClick={reloadConfig} disabled={isSubmitting}>
              Reload config
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Typography.Text type="secondary">
            Pending changes: {pendingChanges.length}
          </Typography.Text>
          <List
            size="small"
            dataSource={pendingChanges}
            locale={{ emptyText: 'No unsaved config changes.' }}
            renderItem={(item) => <List.Item>{item.key}: {String(item.value)}</List.Item>}
          />
          {validationPreview ? (
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Space wrap>
                <Tag color={validationPreview.valid ? 'green' : 'red'}>{validationPreview.valid ? 'valid' : 'invalid'}</Tag>
                {validationPreview.requiresReload ? <Tag color="blue">reload</Tag> : null}
                {validationPreview.requiresRestart ? <Tag color="orange">restart</Tag> : null}
                {validationPreview.requiresNewSession ? <Tag color="purple">new session</Tag> : null}
              </Space>
              {validationPreview.errors.length > 0 ? <Alert type="error" showIcon message={validationPreview.errors.join(' | ')} /> : null}
              {validationPreview.warnings.length > 0 ? <Alert type="warning" showIcon message={validationPreview.warnings.join(' | ')} /> : null}
            </Space>
          ) : null}
        </Space>
      </Card>

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
