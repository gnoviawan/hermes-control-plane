import { Button, Card, Col, Form, Input, List, Popconfirm, Row, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useState } from 'react'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import { useProfileStore } from '../store/profileStore'
import type { MemoryEntryRecord, MemoryProviderRecord, SystemMemoryProfileRecord } from '../types'

const columns: ColumnsType<MemoryEntryRecord> = [
  { title: 'Scope', dataIndex: 'scope', render: (value) => <Tag color={value === 'user' ? 'cyan' : 'purple'}>{value}</Tag> },
  { title: 'Content', dataIndex: 'content' },
  { title: 'Updated', dataIndex: 'updatedAt', render: (value) => new Date(value).toLocaleString() },
]

export function MemoryPage() {
  const [createForm] = Form.useForm<{ scope: 'memory' | 'user'; content: string }>()
  const [editForm] = Form.useForm<{ id: string; content: string }>()
  const [editingEntry, setEditingEntry] = useState<MemoryEntryRecord>()
  const { selectedProfileId } = useProfileStore()
  const profileId = selectedProfileId ?? 'default'

  const entriesQuery = useApiQuery<MemoryEntryRecord[]>(() => apiClient.getAgentMemory(profileId), [profileId])
  const providersQuery = useApiQuery<MemoryProviderRecord[]>(() => apiClient.getAgentMemoryProviders(profileId), [profileId])
  const systemQuery = useApiQuery<SystemMemoryProfileRecord[]>(apiClient.getSystemMemorySummary, [])

  const isMock = entriesQuery.isMock || providersQuery.isMock || systemQuery.isMock
  const error = entriesQuery.error ?? providersQuery.error ?? systemQuery.error

  const refreshAll = async () => {
    await entriesQuery.refresh()
    await providersQuery.refresh()
    await systemQuery.refresh()
  }

  const handleCreate = async (values: { scope: 'memory' | 'user'; content: string }) => {
    const result = await apiClient.createAgentMemory(profileId, values)
    message.success(`Added ${result.data.scope} memory entry${result.mock ? ' (mocked)' : ''}.`)
    createForm.resetFields()
    await refreshAll()
  }

  const handleEdit = async (values: { id: string; content: string }) => {
    const result = await apiClient.patchAgentMemory(profileId, values)
    message.success(`Updated ${result.data.id}${result.mock ? ' (mocked)' : ''}.`)
    setEditingEntry(undefined)
    editForm.resetFields()
    await refreshAll()
  }

  const handleDelete = async (entry: MemoryEntryRecord) => {
    const result = await apiClient.deleteAgentMemory(profileId, entry.id)
    message.success(`Deleted ${entry.id}${result.mock ? ' (mocked)' : ''}.`)
    await refreshAll()
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Memory"
        description="Manage profile-scoped durable notes, user knowledge, and provider-backed memory status through safe dashboard contracts."
        mock={isMock}
        error={error}
        onRefresh={refreshAll}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Entries on active profile</span>
            <Typography.Title level={3}>{entriesQuery.data?.length ?? 0}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Providers</span>
            <Typography.Title level={3}>{providersQuery.data?.length ?? 0}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Profiles with memory</span>
            <Typography.Title level={3}>{systemQuery.data?.filter((item) => item.totalEntries > 0).length ?? 0}</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card className="glass-panel qwen-section-card" title={`Entries · ${profileId}`}>
            <Table
              rowKey="id"
              dataSource={entriesQuery.data ?? []}
              columns={[
                ...columns,
                {
                  title: 'Actions',
                  render: (_, record) => (
                    <Space>
                      <Button
                        size="small"
                        onClick={() => {
                          setEditingEntry(record)
                          editForm.setFieldsValue({ id: record.id, content: record.content })
                        }}
                      >
                        Edit
                      </Button>
                      <Popconfirm title={`Delete ${record.id}?`} onConfirm={() => void handleDelete(record)}>
                        <Button size="small" danger>
                          Delete
                        </Button>
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
              pagination={false}
              loading={entriesQuery.isLoading}
            />
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card className="glass-panel qwen-section-card" title="Add entry">
            <Form form={createForm} layout="vertical" initialValues={{ scope: 'memory' }} onFinish={(values) => void handleCreate(values)}>
              <Form.Item name="scope" label="Scope" rules={[{ required: true }]}>
                <Select options={[{ value: 'memory', label: 'memory' }, { value: 'user', label: 'user' }]} />
              </Form.Item>
              <Form.Item name="content" label="Content" rules={[{ required: true, message: 'Content is required' }]}>
                <Input.TextArea rows={5} placeholder="Store durable, non-secret knowledge only" />
              </Form.Item>
              <Button type="primary" htmlType="submit">
                Add memory
              </Button>
            </Form>
          </Card>

          <Card className="glass-panel qwen-section-card" title="Edit selected entry" style={{ marginTop: 16 }}>
            {editingEntry ? (
              <Form form={editForm} layout="vertical" onFinish={(values) => void handleEdit(values)}>
                <Form.Item name="id" hidden>
                  <Input />
                </Form.Item>
                <Form.Item label="Entry ID">
                  <Input value={editingEntry.id} disabled />
                </Form.Item>
                <Form.Item name="content" label="Content" rules={[{ required: true }]}>
                  <Input.TextArea rows={4} />
                </Form.Item>
                <Button type="primary" htmlType="submit">
                  Update memory
                </Button>
              </Form>
            ) : (
              <Typography.Text type="secondary">Choose an entry from the table to replace its content.</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card className="glass-panel qwen-section-card" title="Memory providers" loading={providersQuery.isLoading}>
            <List
              dataSource={providersQuery.data ?? []}
              renderItem={(provider) => (
                <List.Item>
                  <Space direction="vertical" size={2}>
                    <Typography.Text strong>{provider.name}</Typography.Text>
                    <Typography.Text type="secondary">{provider.source ?? 'unknown source'}</Typography.Text>
                  </Space>
                  <Space>
                    <Tag color={provider.status === 'healthy' ? 'green' : 'gold'}>{provider.status}</Tag>
                    <Tag>{provider.entryCount} entries</Tag>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card className="glass-panel qwen-section-card" title="System memory summary" loading={systemQuery.isLoading}>
            <Table
              rowKey="agentId"
              dataSource={systemQuery.data ?? []}
              pagination={false}
              columns={[
                { title: 'Profile', dataIndex: 'agentId' },
                { title: 'Total', dataIndex: 'totalEntries' },
                { title: 'Memory', dataIndex: 'memoryEntries' },
                { title: 'User', dataIndex: 'userEntries' },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
