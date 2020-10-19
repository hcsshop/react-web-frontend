import React, { useState, useEffect } from 'react'
import { Layout, Breadcrumb, message } from 'antd'
import { BarsOutlined, UserAddOutlined, DeleteOutlined } from '@ant-design/icons'
import { Link, useParams, useHistory } from 'react-router-dom'
import Helmet from 'react-helmet'

import { deleteOrder } from '../../helpers'

import TopNav from '../TopNav/TopNav'
import Sidebar from '../Sidebar/Sidebar'
import OrderCard from './OrderCard'
import client from '../../feathers/client'
import Loader from '../Loader/Loader'

const ViewOrder = () => {
  const history = useHistory()

  const { uuid } = useParams()
  const [order, setOrder] = useState(null)
  const [orderLoaded, setOrderLoaded] = useState(false)

  useEffect(() => {
    const getOrder = async uuid => {
      try {
        const data = await client.service('orders').get(uuid)
        setOrder(data)
        setOrderLoaded(true)
      } catch (err) {
        console.error(err)
        message.error('An error occurred loading this order. Please try again.')
        setOrder(null)
        setOrderLoaded(true)
      }
    }

    if (!orderLoaded) getOrder(uuid)
  }, [orderLoaded, uuid])

  const sidebarIconStyle = { position: 'relative', top: '-3px' }

  const sidebarActions = [
    {
      icon: <BarsOutlined />,
      title: 'Common Tasks',

      items: [
        {
          icon: <UserAddOutlined style={sidebarIconStyle} />,
          title: 'New Order',
          onClick: () => history.push('/orders/new')
        },
        {
          icon: <DeleteOutlined style={sidebarIconStyle} />,
          title: 'Delete Order',
          onClick: () => deleteOrder({ order, history })
        }
      ]
    }
  ]

  return (
    <Layout>
      {
        order &&
          <Helmet>
            <title>{process.env.REACT_APP_SERVICESHOP_NAME || 'OpenRepairShop'} :: Order {order.uuid.split('-')[0].toUpperCase()}</title>
          </Helmet>
      }

      <TopNav />
      <Layout>
        {window.innerWidth > 800 && <Sidebar actions={sidebarActions} />}

        <Layout style={{ padding: '0 24px 24px', minHeight: '100vh' }}>
          {
            orderLoaded &&
              <Breadcrumb style={{ margin: '16px 0' }}>
                <Breadcrumb.Item><Link to='/'>{process.env.REACT_APP_SERVICESHOP_NAME || 'Home'}</Link></Breadcrumb.Item>
                <Breadcrumb.Item><Link to='/orders'>Orders</Link></Breadcrumb.Item>
                <Breadcrumb.Item>
                  <Link to={`/customers/view/${order.customerData.uuid}`}>
                    {order.customerData.profile.name.display}
                  </Link>
                </Breadcrumb.Item>
                <Breadcrumb.Item>
                  <Link to={`/orders/view/${order.uuid}`}>
                    {order.uuid.split('-')[0].toUpperCase()}
                  </Link>
                </Breadcrumb.Item>
              </Breadcrumb>
          }

          {!orderLoaded && <Loader text='Loading order..' />}
          {order && <OrderCard order={order} />}
        </Layout>
      </Layout>
    </Layout>
  )
}

export default ViewOrder
