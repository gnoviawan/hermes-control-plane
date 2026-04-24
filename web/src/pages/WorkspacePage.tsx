import { Button, Card, Col, List, Row, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useState } from 'react'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import { useProfileStore } from '../store/profileStore'
import type { CheckpointRecord, WorkspaceArtifactRecord, WorkspaceTreeEntryRecord } from '../types'

const treeColumns: ColumnsType<WorkspaceTreeEntryRecord> = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Path', dataIndex: 'path' },
  { title: 'Type', dataIndex: 'type', render: (value) => <Tag color={value === 'directory' ? 'blue' : 'default'}>{value}</Tag> },
  { title: 'Size', dataIndex: 'sizeBytes', render: (value) => (value == null ? '—' : `${value} B`) },
]

const artifactColumns: ColumnsType<WorkspaceArtifactRecord> = [
  { title: 'Artifact', dataIndex: 'name' },
  { title: 'Path', dataIndex: 'path' },
  { title: 'Kind', dataIndex: 'kind', render: (value) => <Tag color={value === 'directory' ? 'purple' : 'green'}>{value}</Tag> },
  { title: 'Size', dataIndex: 'sizeBytes', render: (value) => (value == null ? '—' : `${value} B`) },
]

export function WorkspacePage() {
  const { selectedProfileId } = useProfileStore()
  const profileId = selectedProfileId ?? 'default'
  const [selectedFilePath, setSelectedFilePath] = useState('')

  const treeQuery = useApiQuery<WorkspaceTreeEntryRecord[]>(() => apiClient.getAgentWorkspaceTree(profileId), [profileId])
  const artifactsQuery = useApiQuery<WorkspaceArtifactRecord[]>(() => apiClient.getAgentWorkspaceArtifacts(profileId), [profileId])
  const checkpointsQuery = useApiQuery<CheckpointRecord[]>(() => apiClient.getAgentCheckpoints(profileId), [profileId])
  const activeFilePath =
    selectedFilePath || treeQuery.data?.find((entry) => entry.type === 'file')?.path || 'notes/todo.md'
  const fileQuery = useApiQuery<{ path: string; content: string; sizeBytes: number }>(
    () => apiClient.getAgentWorkspaceFile(profileId, activeFilePath),
    [profileId, activeFilePath],
  )

  const isMock = treeQuery.isMock || artifactsQuery.isMock || checkpointsQuery.isMock || fileQuery.isMock
  const error = treeQuery.error ?? artifactsQuery.error ?? checkpointsQuery.error ?? fileQuery.error

  const refreshAll = async () => {
    await treeQuery.refresh()
    await artifactsQuery.refresh()
    await checkpointsQuery.refresh()
    await fileQuery.refresh()
  }

  const handleRestore = async (checkpointId: string) => {
    const result = await apiClient.restoreAgentCheckpoint(profileId, checkpointId)
    message.success(`${result.data.message}${result.mock ? ' (mocked)' : ''}`)
    await checkpointsQuery.refresh()
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Workspace"
        description="Inspect the profile workspace tree, browse artifact outputs, preview files, and restore available checkpoints through safe adapter contracts."
        mock={isMock}
        error={error}
        onRefresh={refreshAll}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Workspace entries</span>
            <Typography.Title level={3}>{treeQuery.data?.length ?? 0}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Artifacts</span>
            <Typography.Title level={3}>{artifactsQuery.data?.length ?? 0}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Checkpoints</span>
            <Typography.Title level={3}>{checkpointsQuery.data?.length ?? 0}</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card className="glass-panel qwen-section-card" title={`Workspace tree · ${profileId}`} loading={treeQuery.isLoading}>
            <Table
              rowKey="path"
              columns={treeColumns}
              dataSource={treeQuery.data ?? []}
              pagination={false}
              onRow={(record) => ({
                onClick: () => {
                  if (record.type === 'file') {
                    setSelectedFilePath(record.path)
                  }
                },
              })}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card className="glass-panel qwen-section-card" title="File preview" loading={fileQuery.isLoading}>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Typography.Text strong>{fileQuery.data?.path ?? activeFilePath}</Typography.Text>
              <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                {fileQuery.data?.content ?? 'Select a file from the tree to preview it.'}
              </Typography.Paragraph>
              <Typography.Text type="secondary">
                Size: {fileQuery.data?.sizeBytes != null ? `${fileQuery.data.sizeBytes} B` : '—'}
              </Typography.Text>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card className="glass-panel qwen-section-card" title="Artifacts" loading={artifactsQuery.isLoading}>
            <Table rowKey="path" columns={artifactColumns} dataSource={artifactsQuery.data ?? []} pagination={false} />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card className="glass-panel qwen-section-card" title="Checkpoints" loading={checkpointsQuery.isLoading}>
            <List
              dataSource={checkpointsQuery.data ?? []}
              renderItem={(checkpoint) => (
                <List.Item
                  actions={[
                    <Button key="restore" size="small" onClick={() => void handleRestore(checkpoint.id)}>
                      Restore
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={checkpoint.id}
                    description={
                      <Space direction="vertical" size={2}>
                        <Typography.Text type="secondary">{checkpoint.path}</Typography.Text>
                        <Tag color="green">{checkpoint.status}</Tag>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
