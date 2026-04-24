import { Card, Col, List, Row, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import { useProfileStore } from '../store/profileStore'
import type { AgentSecurityRecord, ApprovalRecord, SystemAllowlistsRecord, SystemSecurityRecord } from '../types'

const approvalColumns: ColumnsType<ApprovalRecord> = [
  { title: 'Approval', dataIndex: 'id' },
  { title: 'Action', dataIndex: 'commandOrAction' },
  { title: 'Severity', dataIndex: 'severity', render: (value: string) => <Tag color={value === 'high' ? 'red' : value === 'medium' ? 'gold' : 'blue'}>{value}</Tag> },
  { title: 'State', dataIndex: 'state', render: (value: string) => <Tag color={value === 'pending' ? 'gold' : 'default'}>{value}</Tag> },
]

export function SecurityPage() {
  const { selectedProfileId } = useProfileStore()
  const profileId = selectedProfileId ?? 'default'

  const approvalsQuery = useApiQuery<ApprovalRecord[]>(() => apiClient.getAgentApprovals(profileId), [profileId])
  const agentSecurityQuery = useApiQuery<AgentSecurityRecord>(() => apiClient.getAgentSecurity(profileId), [profileId])
  const systemSecurityQuery = useApiQuery<SystemSecurityRecord>(apiClient.getSystemSecurity, [])
  const allowlistsQuery = useApiQuery<SystemAllowlistsRecord>(apiClient.getSystemAllowlists, [])

  const isMock = approvalsQuery.isMock || agentSecurityQuery.isMock || systemSecurityQuery.isMock || allowlistsQuery.isMock
  const error = approvalsQuery.error ?? agentSecurityQuery.error ?? systemSecurityQuery.error ?? allowlistsQuery.error

  return (
    <div className="page-stack">
      <PageHeader
        title="Security & Approvals"
        description="Inspect approval queues, dangerous command policy, YOLO state, and allowlists without exposing raw secrets."
        mock={isMock}
        error={error}
        onRefresh={async () => {
          await approvalsQuery.refresh()
          await agentSecurityQuery.refresh()
          await systemSecurityQuery.refresh()
          await allowlistsQuery.refresh()
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
            <span className="qwen-summary-label">Pending approvals</span>
            <Typography.Title level={3}>{approvalsQuery.data?.length ?? 0}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Approval policy</span>
            <Typography.Title level={3}>{agentSecurityQuery.data?.approvalPolicy ?? '—'}</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card className="glass-panel qwen-section-card" title="Approval queue" loading={approvalsQuery.isLoading}>
            <Table
              rowKey="id"
              columns={approvalColumns}
              dataSource={approvalsQuery.data ?? []}
              pagination={false}
              expandable={{
                expandedRowRender: (record) => (
                  <Space direction="vertical" size={4}>
                    <Typography.Text>Reason: {record.reason ?? '—'}</Typography.Text>
                    <Typography.Text type="secondary">Run: {record.runId ?? '—'} · Session: {record.sessionId ?? '—'}</Typography.Text>
                    <Typography.Text type="secondary">Expires: {record.expiresAt ?? '—'}</Typography.Text>
                  </Space>
                ),
              }}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card className="glass-panel qwen-section-card" title="Profile security" loading={agentSecurityQuery.isLoading}>
            <Space direction="vertical" size={10}>
              <Typography.Text>YOLO enabled: <Typography.Text strong>{agentSecurityQuery.data?.allowYolo ? 'Yes' : 'No'}</Typography.Text></Typography.Text>
              <Typography.Text>Dangerous commands:</Typography.Text>
              <Space wrap>
                {(agentSecurityQuery.data?.dangerousCommands ?? []).map((command) => <Tag key={command} color="red">{command}</Tag>)}
              </Space>
              <Typography.Text>Allowlists (redacted):</Typography.Text>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(agentSecurityQuery.data?.allowlists ?? {}, null, 2)}</pre>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card className="glass-panel qwen-section-card" title="System security" loading={systemSecurityQuery.isLoading}>
            <List
              size="small"
              dataSource={[
                `Profiles: ${(systemSecurityQuery.data?.profiles ?? []).join(', ') || '—'}`,
                `Policies: ${(systemSecurityQuery.data?.approvalPolicies ?? []).join(', ') || '—'}`,
                `YOLO enabled: ${(systemSecurityQuery.data?.yoloEnabledProfiles ?? []).join(', ') || '—'}`,
              ]}
              renderItem={(item) => <List.Item>{item}</List.Item>}
            />
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card className="glass-panel qwen-section-card" title="Aggregated allowlists" loading={allowlistsQuery.isLoading}>
            <List
              size="small"
              dataSource={[
                `Commands: ${(allowlistsQuery.data?.commands ?? []).join(', ') || '—'}`,
                `Paths: ${(allowlistsQuery.data?.paths ?? []).join(', ') || '—'}`,
                `Hosts: ${(allowlistsQuery.data?.hosts ?? []).join(', ') || '—'}`,
                `Profiles: ${(allowlistsQuery.data?.profiles ?? []).join(', ') || '—'}`,
              ]}
              renderItem={(item) => <List.Item>{item}</List.Item>}
            />
          </Card>
        </Col>
      </Row>

      <Card className="glass-panel qwen-section-card" title="Write restrictions" loading={agentSecurityQuery.isLoading}>
        <List
          size="small"
          dataSource={agentSecurityQuery.data?.writeRestrictions ?? []}
          renderItem={(item) => <List.Item>{item}</List.Item>}
        />
      </Card>
    </div>
  )
}
