import {
  ClockCircleOutlined,
  DashboardOutlined,
  FileTextOutlined,
  ProfileOutlined,
  RadarChartOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import { Avatar, Layout, Menu, Select, Space, Tag, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { useProfileStore } from '../store/profileStore'

const navigationItems: MenuProps['items'] = [
  {
    type: 'group',
    label: 'Control Plane',
    children: [
      { key: '/overview', icon: <DashboardOutlined />, label: 'Overview' },
      { key: '/profiles', icon: <ProfileOutlined />, label: 'Profiles' },
      { key: '/skills', icon: <ToolOutlined />, label: 'Skills' },
    ],
  },
  {
    type: 'group',
    label: 'Operations',
    children: [
      { key: '/sessions', icon: <RadarChartOutlined />, label: 'Sessions' },
      { key: '/cron-jobs', icon: <ClockCircleOutlined />, label: 'Cron Jobs' },
      { key: '/logs', icon: <FileTextOutlined />, label: 'Logs' },
    ],
  },
]

export function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { selectedProfileId, setSelectedProfileId } = useProfileStore()
  const profilesQuery = useApiQuery(apiClient.getProfiles, [])
  const selectedProfile = profilesQuery.data?.find((profile) => profile.id === selectedProfileId) ?? profilesQuery.data?.[0]

  if (!selectedProfileId && selectedProfile?.id) {
    setSelectedProfileId(selectedProfile.id)
  }

  return (
    <Layout className="hermes-shell">
      <Layout.Sider breakpoint="lg" collapsedWidth={80} className="hermes-sider">
        <div className="hermes-logo">
          <div className="hermes-logo-mark">H</div>
          <div className="hermes-logo-copy">
            <span className="hermes-logo-title">Hermes Control</span>
            <span className="hermes-logo-subtitle">Phase 1 dashboard</span>
          </div>
        </div>
        <Menu
          mode="inline"
          theme="dark"
          className="hermes-menu"
          selectedKeys={[location.pathname]}
          items={navigationItems}
          onClick={({ key }) => navigate(key)}
        />
      </Layout.Sider>
      <Layout className="hermes-layout">
        <Layout.Header className="hermes-header">
          <div className="hermes-header-title">
            <h1>Hermes Control Plane</h1>
            <span>QwenPaw-inspired shell for global management, profile switching, and operational visibility.</span>
          </div>
          <Space className="hermes-header-actions" size={12} wrap>
            <Tag color={profilesQuery.isMock ? 'gold' : 'blue'}>{profilesQuery.isMock ? 'Mock API' : 'Live API'}</Tag>
            <Select
              style={{ minWidth: 220 }}
              loading={profilesQuery.isLoading}
              placeholder="Select profile"
              value={selectedProfile?.id}
              options={(profilesQuery.data ?? []).map((profile) => ({
                label: `${profile.name} · ${profile.gatewayState}`,
                value: profile.id,
              }))}
              onChange={setSelectedProfileId}
            />
            <Space size={10}>
              <Avatar style={{ background: '#2563eb' }}>HC</Avatar>
              <div>
                <Typography.Text strong style={{ display: 'block', color: '#f8fafc' }}>
                  {selectedProfile?.name ?? 'No profile'}
                </Typography.Text>
                <Typography.Text type="secondary">{selectedProfile?.path ?? 'Awaiting profile data'}</Typography.Text>
              </div>
            </Space>
          </Space>
        </Layout.Header>
        <Layout.Content className="hermes-content">
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  )
}
