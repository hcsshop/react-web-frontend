import React, { useEffect, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { Layout, Breadcrumb, Row, Col, Typography, Skeleton } from 'antd'
import { AuditOutlined, CalendarOutlined, BarsOutlined, UserAddOutlined } from '@ant-design/icons'

import TopNav from '../TopNav/TopNav'
import Sidebar from '../Sidebar/Sidebar'
import AppointmentCard from './AppointmentCard'
import OrderCard from './OrderCard'

import client from '../../feathers/client'

const { Title } = Typography

const Home = () => {
  const history = useHistory()
  const [appointments, setAppointments] = useState()
  const [orders, setOrders] = useState()

  useEffect(() => {
    const go = async () => {
      if (!appointments) {
        const results = await client.service('appointments').find({ query: { 'spacetime.start': { $gt: Date.now() - (2 * 60 * 60 * 1000) }, $sort: { 'spacetime.start': 1 } } })
        setAppointments(results.data)
      }

      if (!orders) {
        const results = await client.service('orders').find({ query: { status: 'pending', $sort: { createdAt: 1 } } })
        setOrders(results.data)
      }
    }

    go()
  }, [appointments, orders])

  const sidebarIconStyle = { position: 'relative', top: '-3px' }
  const sidebarActions = [
    {
      icon: <BarsOutlined style={sidebarIconStyle} />,
      title: 'Common Tasks',

      items: [
        {
          icon: <CalendarOutlined style={sidebarIconStyle} />,
          title: 'New Appointment',
          onClick: () => {
            history.push('/appointments/new')
          }
        },

        {
          icon: <UserAddOutlined style={sidebarIconStyle} />,
          title: 'New Customer',
          onClick: () => {
            history.push('/customers/new')
          }
        },

        {
          icon: <AuditOutlined style={sidebarIconStyle} />,
          title: 'New Order',
          onClick: () => {
            history.push('/orders/new')
          }
        }
      ]
    }
  ]

  return (
    <Layout>
      <TopNav />
      <Layout>
        {window.innerWidth > 800 && <Sidebar actions={sidebarActions} />}

        <Layout style={{ padding: '24px 24px 24px', minHeight: '100vh' }}>
          {/* <Breadcrumb style={{ margin: '16px 0' }}>
            <Breadcrumb.Item>{process.env.REACT_APP_SERVICESHOP_NAME || 'Home'}</Breadcrumb.Item>
            <Breadcrumb.Item>Dashboard</Breadcrumb.Item>
          </Breadcrumb> */}

          <Title style={{ fontSize: '2em' }}>
            <CalendarOutlined className='heading-icon' />
            Upcoming Appointments
          </Title>

          {!appointments && <Skeleton active />}

          {
            appointments &&
              <div className='animate__animated animate__zoomIn animate__faster'>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                  {/* <pre>{JSON.stringify(appointments, null, 2)}</pre> */}
                  {
                    appointments.map(appointment => {
                      return (
                        <Col key={Math.random().toString(36)} className='gutter-row' xs={24} xl={12} style={{ marginBottom: '2em' }}>
                          <AppointmentCard appointment={appointment} />
                        </Col>
                      )
                    })
                  }
                </Row>
              </div>
          }

          <div style={{ height: '2em', margin: '2em', borderTop: '1px solid #888' }} />

          <Title style={{ fontSize: '2em' }}>
            <AuditOutlined className='heading-icon' />
            Active Orders
          </Title>
          {!orders && <Skeleton active />}

          {
            orders &&
              <div className='animate__animated animate__zoomIn animate__faster'>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                  {/* <pre>{JSON.stringify(orders, null, 2)}</pre> */}
                  {
                    orders.map(order => {
                      return (
                        <Col key={Math.random().toString(36)} className='gutter-row' xs={24} xl={12} style={{ marginBottom: '2em' }}>
                          <OrderCard order={order} />
                        </Col>
                      )
                    })
                  }
                </Row>
              </div>
          }
        </Layout>
      </Layout>
    </Layout>
  )
}

export default Home
