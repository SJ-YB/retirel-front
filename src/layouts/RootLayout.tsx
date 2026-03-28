import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu } from 'antd'
import {
  DashboardOutlined,
  BankOutlined,
  SwapOutlined,
  PieChartOutlined,
} from '@ant-design/icons'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '대시보드' },
  { key: '/accounts', icon: <BankOutlined />, label: '계좌 목록' },
  { key: '/transactions', icon: <SwapOutlined />, label: '거래 내역' },
  { key: '/assets', icon: <PieChartOutlined />, label: '자산 현황' },
]

function RootLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Layout style={{ minHeight: '100svh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
        }}
      >
        <span
          style={{ color: '#fff', fontSize: 18, fontWeight: 600, cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          Retirel
        </span>
      </Header>
      <Layout>
        <Sider width={220}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ height: '100%' }}
          />
        </Sider>
        <Content style={{ padding: '24px 32px' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default RootLayout
