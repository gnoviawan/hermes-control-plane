import { Card, Col, List, Row, Space, Switch, Tag, Typography } from 'antd'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import { useProfileStore } from '../store/profileStore'
import type { AgentConfigRecord } from '../types'

export function ConfigPage() {
  const { selectedProfileId } = useProfileStore()
  const profileId = selectedProfileId ?? 'default'
  const { data, isLoading, isMock, error, refresh } = useApiQuery<AgentConfigRecord>(() => apiClient.getAgentConfig(profileId), [profileId])

  return (
    <div className="page-stack">
      <PageHeader
        title="Config"
        description="Inspect effective config, profile overrides, runtime toggles, and write restrictions for the active Hermes profile."
        mock={isMock}
        error={error}
        onRefresh={refresh}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card" loading={isLoading}>
            <span className="qwen-summary-label">Profile</span>
            <Typography.Title level={3}>{data?.agentId ?? profileId}</Typography.Title>
            <Typography.Text type="secondary">{data?.path ?? 'Config path unavailable'}</Typography.Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card" loading={isLoading}>
            <span className="qwen-summary-label">Checkpoints</span>
            <Typography.Title level={3}>{data?.runtimeToggles.checkpointsEnabled ? 'On' : 'Off'}</Typography.Title>
            <Switch checked={data?.runtimeToggles.checkpointsEnabled} disabled />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card" loading={isLoading}>
            <span className="qwen-summary-label">Worktree</span>
            <Typography.Title level={3}>{data?.runtimeToggles.worktreeEnabled ? 'On' : 'Off'}</Typography.Title>
            <Switch checked={data?.runtimeToggles.worktreeEnabled} disabled />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card className="glass-panel qwen-section-card" title="Effective config" loading={isLoading}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(data?.effectiveConfig ?? {}, null, 2)}</pre>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card className="glass-panel qwen-section-card" title="Profile overrides" loading={isLoading}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(data?.profileOverrides ?? {}, null, 2)}</pre>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8}>
          <Card className="glass-panel qwen-section-card" title="Editable fields" loading={isLoading}>
            <Space wrap>
              {(data?.editableFields ?? []).map((field) => (
                <Tag key={field} color="blue">{field}</Tag>
              ))}
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card className="glass-panel qwen-section-card" title="Deferred fields" loading={isLoading}>
            <Space wrap>
              {(data?.deferredFields ?? []).map((field) => (
                <Tag key={field} color="gold">{field}</Tag>
              ))}
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card className="glass-panel qwen-section-card" title="Write restrictions" loading={isLoading}>
            <List
              size="small"
              dataSource={data?.writeRestrictions ?? []}
              renderItem={(item) => <List.Item>{item}</List.Item>}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
