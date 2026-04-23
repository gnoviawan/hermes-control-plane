import {
  ClockCircleOutlined,
  ConsoleSqlOutlined,
  FileTextOutlined,
  ProfileOutlined,
  RadarChartOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import { Layout, Menu, Select, Space, Tag, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import { useApiQuery } from '../api/hooks'
import { useProfileStore } from '../store/profileStore'

const navigationItems: MenuProps['items'] = [
  {
    key: 'control-group',
    label: 'Control',
    children: [
      { key: '/overview', label: 'Overview' },
      { key: '/console', icon: <ConsoleSqlOutlined />, label: 'Console' },
      { key: '/sessions', icon: <RadarChartOutlined />, label: 'Sessions' },
      { key: '/cron-jobs', icon: <ClockCircleOutlined />, label: 'Cron Jobs' },
      { key: '/logs', icon: <FileTextOutlined />, label: 'Logs' },
    ],
  },
  {
    key: 'settings-group',
    label: 'Settings',
    children: [
      { key: '/profiles', icon: <ProfileOutlined />, label: 'Profiles' },
      { key: '/skills', icon: <ToolOutlined />, label: 'Skills' },
    ],
  },
]

export function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { selectedProfileId, setSelectedProfileId } = useProfileStore()
  const profilesQuery = useApiQuery(apiClient.getProfiles, [])
  const selectedProfile = profilesQuery.data?.find((profile) => profile.id === selectedProfileId) ?? profilesQuery.data?.[0]
  const profileCount = profilesQuery.data?.length ?? 0

  useEffect(() => {
    if (!selectedProfileId && selectedProfile?.id) {
      setSelectedProfileId(selectedProfile.id)
    }
  }, [selectedProfileId, selectedProfile?.id, setSelectedProfileId])

  return (
    <Layout className="hermes-shell qwen-shell">
      <Layout.Header className="hermes-topbar">
        <div className="hermes-topbar-brand">
          <div className="hermes-logo-wordmark">
            <img alt="Hermes Control" className="hermes-logo-image" src="/favicon.svg" />
            <div className="hermes-logo-meta">
              <span className="hermes-logo-wordmark-main">Hermes Control</span>
              <span className="hermes-logo-wordmark-subtitle">Standalone workspace console</span>
            </div>
            <span className="hermes-logo-divider" />
            <span className="hermes-logo-wordmark-badge">Phase 1</span>
          </div>
        </div>
        <Space size={12} className="hermes-topbar-actions">
          <Typography.Text className="hermes-topbar-link">Control Plane</Typography.Text>
          <Typography.Text className="hermes-topbar-link">Profiles</Typography.Text>
          <span className="hermes-topbar-divider" />
          <Tag bordered={false} color={profilesQuery.isMock ? 'gold' : 'orange'}>
            {profilesQuery.isMock ? 'Mock mode' : 'Live mode'}
          </Tag>
          <Typography.Text className="hermes-topbar-status">
            {selectedProfile?.name ?? 'No workspace selected'}
          </Typography.Text>
        </Space>
      </Layout.Header>

      <Layout className="hermes-main-layout">
        <Layout.Sider width={248} breakpoint="lg" collapsedWidth={72} className="hermes-sider">
          <div className="hermes-agent-scoped-section">
            <div className="hermes-agent-panel">
              <div className="hermes-agent-panel-header">
                <div className="hermes-agent-panel-label">Current workspace</div>
                <span className="hermes-agent-panel-count">{profileCount}</span>
              </div>
              <Select
                className="hermes-agent-selector"
                loading={profilesQuery.isLoading}
                placeholder="Select profile"
                value={selectedProfile?.id}
                options={(profilesQuery.data ?? []).map((profile) => ({
                  label: `${profile.name}`,
                  value: profile.id,
                }))}
                onChange={setSelectedProfileId}
              />
              <Typography.Text className="hermes-agent-panel-hint">
                {selectedProfile?.description ?? 'Hermes profile scope'}
              </Typography.Text>
            </div>

            <Menu
              mode="inline"
              className="hermes-menu hermes-menu-scoped"
              selectedKeys={[location.pathname]}
              defaultOpenKeys={['control-group', 'settings-group']}
              items={navigationItems}
              onClick={({ key }) => navigate(key)}
            />
          </div>
        </Layout.Sider>

        <Layout className="hermes-layout">
          <Layout.Content className="hermes-content">
            <div className="hermes-page-container">
              <Outlet />
            </div>
          </Layout.Content>
        </Layout>
      </Layout>
    </Layout>
  )
}
