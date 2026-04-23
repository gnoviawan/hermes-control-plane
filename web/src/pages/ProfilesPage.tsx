import { Button, Card, Col, Form, Input, Row, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import type { CreateProfilePayload, Profile } from '../types'

const columns: ColumnsType<Profile> = [
  {
    title: 'Profile',
    dataIndex: 'name',
    render: (_, profile) => (
      <Space direction="vertical" size={2}>
        <Typography.Text strong>{profile.name}</Typography.Text>
        <Typography.Text type="secondary">{profile.description}</Typography.Text>
      </Space>
    ),
  },
  { title: 'Path', dataIndex: 'path' },
  {
    title: 'Gateway',
    dataIndex: 'gatewayState',
    render: (state: Profile['gatewayState']) => <Tag color={state === 'online' ? 'green' : state === 'degraded' ? 'gold' : 'red'}>{state}</Tag>,
  },
  {
    title: 'Skills',
    render: (_, profile) => `${profile.skillsEnabled}/${profile.skillCount}`,
  },
  { title: 'Sessions', dataIndex: 'sessions' },
  { title: 'Last sync', dataIndex: 'lastSync' },
]

export function ProfilesPage() {
  const [form] = Form.useForm<CreateProfilePayload>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { data, isLoading, isMock, error, refresh } = useApiQuery(apiClient.getProfiles, [])
  const cloneOptions = useMemo(
    () => (data ?? []).map((profile) => ({ label: profile.name, value: profile.id })),
    [data],
  )
  const healthyProfiles = (data ?? []).filter((profile) => profile.gatewayState === 'online').length
  const degradedProfiles = (data ?? []).filter((profile) => profile.gatewayState === 'degraded').length

  const handleCreateProfile = async (values: CreateProfilePayload) => {
    setIsSubmitting(true)
    const result = await apiClient.createProfile(values)
    setIsSubmitting(false)
    message.success(`Prepared profile ${result.data.name}${result.mock ? ' using mocked API flow' : ''}.`)
    form.resetFields()
    await refresh()
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Profiles"
        description="List available Hermes profiles, active paths, and create new management scopes with clone options."
        mock={isMock}
        error={error}
        onRefresh={refresh}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Total workspaces</span>
            <Typography.Title level={3}>{data?.length ?? 0}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Healthy gateways</span>
            <Typography.Title level={3}>{healthyProfiles}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Needs attention</span>
            <Typography.Title level={3}>{degradedProfiles}</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card className="glass-panel qwen-section-card" title="Available profiles">
            <Table rowKey="id" loading={isLoading} dataSource={data ?? []} columns={columns} pagination={false} />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card className="glass-panel qwen-section-card" title="Create profile">
            <Typography.Paragraph className="qwen-card-description">
              Create a new isolated workspace and optionally clone a working baseline from an existing profile.
            </Typography.Paragraph>
            <Form form={form} layout="vertical" onFinish={(values) => void handleCreateProfile(values)}>
              <Form.Item name="name" label="Profile name" rules={[{ required: true, message: 'Please provide a profile name' }]}>
                <Input placeholder="e.g. Release Ops" />
              </Form.Item>
              <Form.Item name="description" label="Description">
                <Input.TextArea rows={3} placeholder="Short context for why this profile exists" />
              </Form.Item>
              <Form.Item name="cloneFrom" label="Clone from profile">
                <Select allowClear options={cloneOptions} placeholder="Optional source profile" />
              </Form.Item>
              <Form.Item name="cloneAll" label="Clone all skills" initialValue={true}>
                <Select
                  options={[
                    { label: 'Yes, copy all enabled skills', value: true },
                    { label: 'No, start empty', value: false },
                  ]}
                />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={isSubmitting} block>
                Create profile
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
