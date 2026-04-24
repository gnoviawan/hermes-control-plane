import { Card, Col, Empty, List, Row, Segmented, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import { useProfileStore } from '../store/profileStore'
import type { AgentDiagnosticsRecord, DiagnosticsCheckRecord, LogEntry, SetupCheckRecord, SystemDoctorRecord, SystemHealthRecord } from '../types'

const columns: ColumnsType<LogEntry> = [
  { title: 'Timestamp', dataIndex: 'timestamp', render: (value) => new Date(value).toLocaleString() },
  { title: 'Level', dataIndex: 'level', render: (value: LogEntry['level']) => <Tag color={value === 'ERROR' ? 'red' : value === 'WARN' ? 'gold' : 'blue'}>{value}</Tag> },
  { title: 'Source', dataIndex: 'source' },
  {
    title: 'Message',
    dataIndex: 'message',
    render: (value: string) => <Typography.Text code>{value}</Typography.Text>,
  },
]

function checkColor(check: DiagnosticsCheckRecord): string {
  if (!check.ok || check.severity === 'error') return 'red'
  if (check.severity === 'warning') return 'gold'
  return 'green'
}

export function LogsPage() {
  const [level, setLevel] = useState<'ALL' | LogEntry['level']>('ALL')
  const { selectedProfileId } = useProfileStore()
  const profileId = selectedProfileId ?? 'default'

  const logsQuery = useApiQuery(apiClient.getLogs, [])
  const healthQuery = useApiQuery<SystemHealthRecord>(apiClient.getSystemHealth, [])
  const doctorQuery = useApiQuery<SystemDoctorRecord>(apiClient.getSystemDoctor, [])
  const setupQuery = useApiQuery<SetupCheckRecord>(apiClient.getSystemSetupCheck, [])
  const diagnosticsQuery = useApiQuery<AgentDiagnosticsRecord>(() => apiClient.getAgentDiagnostics(profileId), [profileId])

  const data = logsQuery.data
  const filteredData = useMemo(
    () => (data ?? []).filter((entry) => level === 'ALL' || entry.level === level),
    [data, level],
  )
  const infoCount = (data ?? []).filter((entry) => entry.level === 'INFO').length
  const warnCount = (data ?? []).filter((entry) => entry.level === 'WARN').length
  const errorCount = (data ?? []).filter((entry) => entry.level === 'ERROR').length
  const isMock = logsQuery.isMock || healthQuery.isMock || doctorQuery.isMock || setupQuery.isMock || diagnosticsQuery.isMock
  const error = logsQuery.error ?? healthQuery.error ?? doctorQuery.error ?? setupQuery.error ?? diagnosticsQuery.error

  const refreshAll = async () => {
    await logsQuery.refresh()
    await healthQuery.refresh()
    await doctorQuery.refresh()
    await setupQuery.refresh()
    await diagnosticsQuery.refresh()
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Logs & Diagnostics"
        description="Review control plane logs, system health, doctor checks, setup readiness, and profile-scoped diagnostics from one operational page."
        mock={isMock}
        error={error}
        actions={<Segmented value={level} options={['ALL', 'INFO', 'WARN', 'ERROR']} onChange={(value) => setLevel(value as typeof level)} />}
        onRefresh={refreshAll}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">System status</span>
            <Typography.Title level={3}>{healthQuery.data?.status ?? 'unknown'}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Warnings</span>
            <Typography.Title level={3}>{warnCount}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Errors</span>
            <Typography.Title level={3}>{errorCount}</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8}>
          <Card className="glass-panel qwen-section-card" title="System health" loading={healthQuery.isLoading}>
            <Space direction="vertical" size={8}>
              <Typography.Text strong>{healthQuery.data?.service}</Typography.Text>
              <Typography.Text type="secondary">API {healthQuery.data?.apiVersion} · App {healthQuery.data?.appVersion}</Typography.Text>
              <Typography.Text>Adapter: {healthQuery.data?.adapter.kind}</Typography.Text>
              <Typography.Text>Hermes home: {healthQuery.data?.adapter.hermesHome}</Typography.Text>
              <Typography.Text>Active profile: {healthQuery.data?.runtime.activeProfile ?? '—'}</Typography.Text>
              <Typography.Text>Gateway: {healthQuery.data?.runtime.gatewayState ?? '—'}</Typography.Text>
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card className="glass-panel qwen-section-card" title="Doctor checks" loading={doctorQuery.isLoading}>
            <List
              dataSource={doctorQuery.data?.checks ?? []}
              renderItem={(check) => (
                <List.Item>
                  <Space direction="vertical" size={2}>
                    <Space>
                      <Typography.Text strong>{check.name}</Typography.Text>
                      <Tag color={checkColor(check)}>{check.ok ? 'ok' : 'attention'}</Tag>
                    </Space>
                    <Typography.Text type="secondary">{check.detail}</Typography.Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card className="glass-panel qwen-section-card" title="Setup readiness" loading={setupQuery.isLoading}>
            <List
              dataSource={setupQuery.data?.items ?? []}
              renderItem={(item) => (
                <List.Item>
                  <Space direction="vertical" size={2}>
                    <Space>
                      <Typography.Text strong>{item.key}</Typography.Text>
                      <Tag color={item.configured ? 'green' : 'red'}>{item.configured ? 'configured' : 'missing'}</Tag>
                    </Space>
                    <Typography.Text type="secondary">{item.value}</Typography.Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card className="glass-panel qwen-section-card" title={`Agent diagnostics · ${profileId}`} loading={diagnosticsQuery.isLoading}>
            <List
              dataSource={diagnosticsQuery.data?.checks ?? []}
              renderItem={(check) => (
                <List.Item>
                  <Space direction="vertical" size={2}>
                    <Space>
                      <Typography.Text strong>{check.name}</Typography.Text>
                      <Tag color={checkColor(check)}>{check.severity}</Tag>
                    </Space>
                    <Typography.Text type="secondary">{check.detail}</Typography.Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Info logs</span>
            <Typography.Title level={3}>{infoCount}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Warnings</span>
            <Typography.Title level={3}>{warnCount}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Errors</span>
            <Typography.Title level={3}>{errorCount}</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Card className="glass-panel qwen-section-card" title="Log stream">
        {filteredData.length ? (
          <Table rowKey="id" loading={logsQuery.isLoading} dataSource={filteredData} columns={columns} pagination={false} />
        ) : (
          <Empty description="No logs for the selected level" />
        )}
      </Card>
    </div>
  )
}
