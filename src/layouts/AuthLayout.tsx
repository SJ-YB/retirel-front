import { Outlet } from 'react-router-dom'
import { Layout } from 'antd'

const { Content } = Layout

function AuthLayout() {
  return (
    <Layout style={{ minHeight: '100svh', justifyContent: 'center', alignItems: 'center' }}>
      <Content style={{ width: 400, maxWidth: '100%', padding: 32 }}>
        <Outlet />
      </Content>
    </Layout>
  )
}

export default AuthLayout
