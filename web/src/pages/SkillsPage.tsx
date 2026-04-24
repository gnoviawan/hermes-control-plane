import { Button, Card, Col, Form, List, Row, Select, Space, Switch, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import { useProfileStore } from '../store/profileStore'
import type { Skill, SkillBroadcastPayload, SystemSkillLibraryRecord } from '../types'

export function SkillsPage() {
  const [form] = Form.useForm<SkillBroadcastPayload>()
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [runningSkillId, setRunningSkillId] = useState<string>()
  const { selectedProfileId } = useProfileStore()
  const profilesQuery = useApiQuery(apiClient.getProfiles, [])
  const activeProfileId = selectedProfileId ?? profilesQuery.data?.[0]?.id ?? 'default'
  const skillsQuery = useApiQuery(() => apiClient.getSkills(activeProfileId), [activeProfileId])
  const libraryQuery = useApiQuery<SystemSkillLibraryRecord[]>(apiClient.getSystemSkillLibrary, [])

  const profileOptions = useMemo(
    () => (profilesQuery.data ?? []).map((profile) => ({ label: profile.name, value: profile.id })),
    [profilesQuery.data],
  )
  const enabledCount = (skillsQuery.data ?? []).filter((skill) => skill.enabled).length
  const installedCount = (skillsQuery.data ?? []).filter((skill) => skill.installed).length
  const broadcastTargets = Math.max(profileOptions.filter((profile) => profile.value !== activeProfileId).length, 0)

  const handleToggle = async (skill: Skill, enabled: boolean) => {
    const result = await apiClient.toggleSkill(activeProfileId, skill.id, { enabled })
    message.success(`${result.data.name} ${enabled ? 'enabled' : 'disabled'}${result.mock ? ' via mock API' : ''}.`)
    await skillsQuery.refresh()
    await libraryQuery.refresh()
  }

  const handleRun = async (skill: Skill) => {
    setRunningSkillId(skill.id)
    const result = await apiClient.runSkill(activeProfileId, skill.id)
    setRunningSkillId(undefined)
    message.success(`${result.data.message}${result.mock ? ' (mocked)' : ''}`)
  }

  const handleBroadcast = async (values: SkillBroadcastPayload) => {
    setIsBroadcasting(true)
    const result = await apiClient.broadcastSkills(values)
    setIsBroadcasting(false)
    message.success(`Synced skills to ${result.data.synced} profile(s)${result.mock ? ' using mocked API flow' : ''}.`)
    form.resetFields()
    await libraryQuery.refresh()
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
    { title: 'Source', dataIndex: 'source', render: (value?: string) => value ?? 'filesystem' },
    {
      title: 'Enabled on active profile',
      render: (_, skill) => <Switch checked={skill.enabled} onChange={(checked) => void handleToggle(skill, checked)} />,
    },
    {
      title: 'Actions',
      render: (_, skill) => (
        <Button size="small" onClick={() => void handleRun(skill)} loading={runningSkillId === skill.id}>
          Run
        </Button>
      ),
    },
  ]

  return (
    <div className="page-stack">
      <PageHeader
        title="Skills"
        description="Manage profile-scoped installed skills, trigger skill runs, and browse the aggregated system skill library."
        mock={skillsQuery.isMock || profilesQuery.isMock || libraryQuery.isMock}
        error={skillsQuery.error ?? profilesQuery.error ?? libraryQuery.error}
        onRefresh={async () => {
          await skillsQuery.refresh()
          await libraryQuery.refresh()
        }}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Installed on active profile</span>
            <Typography.Title level={3}>{installedCount}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Enabled on active profile</span>
            <Typography.Title level={3}>{enabledCount}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-panel qwen-summary-card">
            <span className="qwen-summary-label">Global library size</span>
            <Typography.Title level={3}>{libraryQuery.data?.length ?? 0}</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Card className="glass-panel qwen-context-strip">
        <Space direction="vertical" size={2}>
          <Typography.Text strong>Active profile: {activeProfileId}</Typography.Text>
          <Typography.Text type="secondary">Profile-scoped toggles write through the dashboard adapter instead of exposing raw skill file layout details.</Typography.Text>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={15}>
          <Card className="glass-panel qwen-section-card" title="Installed skills">
            <Table rowKey="id" loading={skillsQuery.isLoading} dataSource={skillsQuery.data ?? []} columns={columns} pagination={false} />
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Card className="glass-panel qwen-section-card" title="Global skill library" loading={libraryQuery.isLoading}>
            <List
              size="small"
              dataSource={libraryQuery.data ?? []}
              renderItem={(item) => (
                <List.Item>
                  <Space direction="vertical" size={2}>
                    <Typography.Text strong>{item.name}</Typography.Text>
                    <Typography.Text type="secondary">{item.description}</Typography.Text>
                    <Space wrap>
                      <Tag color="purple">{item.category}</Tag>
                      <Tag>{item.profileCount} profile(s)</Tag>
                      {item.installedProfiles.map((profileId) => <Tag key={`${item.name}-${profileId}`}>{profileId}</Tag>)}
                    </Space>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Card className="glass-panel qwen-section-card" title="Broadcast skills">
        <Typography.Paragraph className="qwen-card-description">
          Copy enabled skills from the current profile into one or more target profiles.
        </Typography.Paragraph>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ sourceProfileId: activeProfileId }}
          onFinish={(values) => void handleBroadcast(values)}
        >
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="sourceProfileId" label="Source profile" rules={[{ required: true }]}>
                <Select options={profileOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="targetProfileIds" label="Target profiles" rules={[{ required: true, message: 'Choose at least one target profile' }]}>
                <Select mode="multiple" options={profileOptions.filter((profile) => profile.value !== activeProfileId)} />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item label=" ">
                <Button type="primary" htmlType="submit" loading={isBroadcasting} block>
                  Broadcast
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
        <Typography.Text type="secondary">Available targets: {broadcastTargets}</Typography.Text>
      </Card>
    </div>
  )
}
