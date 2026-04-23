import { Button, Card, Col, Form, Row, Select, Space, Switch, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import { useProfileStore } from '../store/profileStore'
import type { Skill, SkillBroadcastPayload } from '../types'

export function SkillsPage() {
  const [form] = Form.useForm<SkillBroadcastPayload>()
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const { selectedProfileId } = useProfileStore()
  const profilesQuery = useApiQuery(apiClient.getProfiles, [])
  const activeProfileId = selectedProfileId ?? profilesQuery.data?.[0]?.id ?? 'default'
  const skillsQuery = useApiQuery(() => apiClient.getSkills(activeProfileId), [activeProfileId])

  const profileOptions = useMemo(
    () => (profilesQuery.data ?? []).map((profile) => ({ label: profile.name, value: profile.id })),
    [profilesQuery.data],
  )
  const enabledCount = (skillsQuery.data ?? []).filter((skill) => skill.enabledProfiles.includes(activeProfileId)).length
  const broadcastTargets = Math.max(profileOptions.filter((profile) => profile.value !== activeProfileId).length, 0)

  const handleToggle = async (skill: Skill, enabled: boolean) => {
    const result = await apiClient.toggleSkill(activeProfileId, skill.id, { enabled })
    message.success(`${result.data.name} ${enabled ? 'enabled' : 'disabled'}${result.mock ? ' via mock API' : ''}.`)
    await skillsQuery.refresh()
  }

  const handleBroadcast = async (values: SkillBroadcastPayload) => {
    setIsBroadcasting(true)
    const result = await apiClient.broadcastSkills(values)
    setIsBroadcasting(false)
    message.success(`Synced skills to ${result.data.synced} profile(s)${result.mock ? ' using mocked API flow' : ''}.`)
    form.resetFields()
  }

  const columns: ColumnsType<Skill> = [
    {
      title: 'Skill',
      dataIndex: 'name',
      render: (_, skill) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong>{skill.name}</Typography.Text>
          <Typography.Text type="secondary">{skill.description}</Typography.Text>
        </Space>
      ),
    },
    { title: 'Category', dataIndex: 'category', render: (value) => <Tag color="purple">{value}</Tag> },
    {
      title: 'Enabled on active profile',
      render: (_, skill) => (
        <Switch
          checked={skill.enabledProfiles.includes(activeProfileId)}
          onChange={(checked) => void handleToggle(skill, checked)}
        />
      ),
    },
    {
      title: 'Profiles',
      render: (_, skill) => skill.enabledProfiles.map((profileId) => <Tag key={profileId}>{profileId}</Tag>),
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      render: (value) => new Date(value).toLocaleString(),
    },
  ]

  return (
    <div className="page-stack">
      <PageHeader
        title="Skills"
        description="Review skill coverage for the selected profile, toggle status, and broadcast configuration to target profiles."
        mock={skillsQuery.isMock || profilesQuery.isMock}
        error={skillsQuery.error ?? profilesQuery.error}
        onRefresh={skillsQuery.refresh}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Catalog size</span>
            <Typography.Title level={3}>{skillsQuery.data?.length ?? 0}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Enabled on active workspace</span>
            <Typography.Title level={3}>{enabledCount}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Broadcast targets</span>
            <Typography.Title level={3}>{broadcastTargets}</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Card className="glass-panel qwen-context-strip">
        <Space direction="vertical" size={2}>
          <Typography.Text strong>Active workspace: {activeProfileId}</Typography.Text>
          <Typography.Text type="secondary">Toggles apply to the workspace selected in the left navigation.</Typography.Text>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card className="glass-panel qwen-section-card" title="Skill catalog">
            <Table rowKey="id" loading={skillsQuery.isLoading} dataSource={skillsQuery.data ?? []} columns={columns} pagination={false} />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card className="glass-panel qwen-section-card" title="Broadcast skills">
            <Typography.Paragraph className="qwen-card-description">
              Copy enabled skills from the current workspace into one or more target workspaces.
            </Typography.Paragraph>
            <Form
              form={form}
              layout="vertical"
              initialValues={{ sourceProfileId: activeProfileId }}
              onFinish={(values) => void handleBroadcast(values)}
            >
              <Form.Item name="sourceProfileId" label="Source profile" rules={[{ required: true }]}>
                <Select options={profileOptions} />
              </Form.Item>
              <Form.Item name="targetProfileIds" label="Target profiles" rules={[{ required: true, message: 'Choose at least one target profile' }]}>
                <Select mode="multiple" options={profileOptions.filter((profile) => profile.value !== activeProfileId)} />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={isBroadcasting} block>
                Broadcast enabled skills
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
