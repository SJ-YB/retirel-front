import { useState } from 'react'
import { Button, Form, Input, Modal, Space, Table, Typography } from 'antd'
import { SearchOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

function App() {
  const [modalOpen, setModalOpen] = useState(false)

  const columns = [
    { title: '자산명', dataIndex: 'name', key: 'name' },
    { title: '유형', dataIndex: 'type', key: 'type' },
    { title: '금액', dataIndex: 'amount', key: 'amount' },
  ]

  const data = [
    { key: '1', name: '삼성전자', type: '주식', amount: '1,000,000원' },
    { key: '2', name: '국민은행 적금', type: '예적금', amount: '5,000,000원' },
  ]

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <Title level={2}>Ant Design Setup Verification</Title>
      <Text type="secondary">ASSET-75: UI Component Library</Text>

      <Space style={{ margin: '24px 0' }}>
        <Button type="primary">Primary Button</Button>
        <Button>Default Button</Button>
        <Button type="dashed">Dashed Button</Button>
        <Button type="primary" icon={<SearchOutlined />}>
          Search
        </Button>
      </Space>

      <Table columns={columns} dataSource={data} pagination={false} />

      <Form layout="vertical" style={{ maxWidth: 400, marginTop: 24 }}>
        <Form.Item label="자산명">
          <Input placeholder="자산명을 입력하세요" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" onClick={() => setModalOpen(true)}>
            Open Modal
          </Button>
        </Form.Item>
      </Form>

      <Modal
        title="확인"
        open={modalOpen}
        onOk={() => setModalOpen(false)}
        onCancel={() => setModalOpen(false)}
      >
        <p>Modal content here</p>
      </Modal>
    </div>
  )
}

export default App
