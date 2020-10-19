import React from 'react'
import { Link, useHistory } from 'react-router-dom'
import { Card, Tag } from 'antd'
import { AuditOutlined } from '@ant-design/icons'
import moment from 'moment'

const OrderCard = ({ order }) => {
  const history = useHistory()

  return (
    <Card
      className='dashboard-card'
      title={<div className='dashboard-card-title'><strong>{order.uuid.split('-')[0].toUpperCase()}</strong></div>}
      style={{ borderRadius: '3px', borderColor: '#999' }}
      extra={
        <Tag color='magenta'>
          <strong>
            Started {moment(order.createdAt).fromNow()}
          </strong>
        </Tag>
      }
      actions={[
        <AuditOutlined key={Math.random().toString(36)} onClick={() => history.push(`/orders/view/${order.uuid}`)} style={{ fontSize: '2em' }} />
      ]}
    >
      {/* <pre>{JSON.stringify(order, null, 2)}</pre> */}

      <div style={{ minHeight: '10rem' }}>
        <Link to={`/customers/view/${order.customer}`}><strong>{order.customerData.profile.name.display}</strong></Link>
        <p>{order.machinesData.length} {order.machinesData.length === 1 ? 'machine' : 'machines'}</p>
        <ul>
          {
            order.machinesData.map(({ uuid, manufacturer, model, serial }) => {
              return (
                <li key={uuid}>{manufacturer} {model} (Serial: {serial})</li>
              )
            })
          }
        </ul>
      </div>
    </Card>
  )
}

export default OrderCard
