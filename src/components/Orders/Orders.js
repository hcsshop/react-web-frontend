/* global localStorage */

import React, { useCallback, useState, useEffect } from 'react'
import { Layout, Breadcrumb, Row, Col, Input, Button, message } from 'antd'
import { BarsOutlined, UserAddOutlined, ReloadOutlined } from '@ant-design/icons'
import { Link, useHistory } from 'react-router-dom'
import DataTable from 'react-data-table-component'
import Helmet from 'react-helmet'
import moment from 'moment'

import Loader from '../Loader/Loader'
import TopNav from '../TopNav/TopNav'
import Sidebar from '../Sidebar/Sidebar'
import client from '../../feathers/client'

client.service('quickbooks').timeout = 20000

const Orders = () => {
  const history = useHistory()

  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [ordersLoaded, setOrdersLoaded] = useState(false)
  const [filter, setFilter] = useState('')
  // const [quickbooksEnabled, setQuickbooksEnabled] = useState(false)

  // Get setting quickbooks.enabled
  // useEffect(() => {
  //   const go = async () => {
  //     const qbEnabled = (await client.service('settings').get('quickbooks.enabled')).enabled
  //     setQuickbooksEnabled(qbEnabled)
  //   }

  //   go()
  // })

  const forceRefresh = useCallback(async () => {
    localStorage.removeItem('orders')
    setOrders([])
    setOrdersLoaded(false)
    const results = await client.service('orders').find({ query: { $limit: -1 } })
    localStorage.setItem('orders', JSON.stringify({ updated: Date.now(), orders }))
    setOrders(results)
    setOrdersLoaded(true)
  }, [orders])

  useEffect(() => {
    const getOrders = async () => {
      if (ordersLoaded) return orders

      try {
        const orders = await client.service('orders').find({ query: { $limit: -1 } })
        localStorage.setItem('orders', JSON.stringify({ updated: Date.now(), orders }))
        setOrders(orders)
        setOrdersLoaded(true)
      } catch (err) {
        console.error(err)
        message.error('An error occurred loading orders. Please try again later.')
        setOrders([])
        setOrdersLoaded(true)
      }
    }

    if (!ordersLoaded) {
      let localOrders

      try {
        localOrders = JSON.parse(localStorage.getItem('orders'))
      } catch (e) {
        localOrders = null
      }

      if (localOrders) {
        const diff = Date.now() - localOrders.updated
        if (diff >= (process.env.REACT_APP_CACHE_ORDERS_MS || 1800000)) {
          console.warn('Expiring cached orders')
          forceRefresh()
        } else {
          console.log('Loading orders from cache')
          setOrders(localOrders.orders)
          setOrdersLoaded(true)
        }
      } else {
        getOrders()
      }
    }
  }, [forceRefresh, orders, ordersLoaded])

  useEffect(() => {
    if (filter === '') {
      setFilteredOrders(orders)
    } else {
      const filtered = orders.filter(order => {
        const splitFilter = filter.split(' ')
        console.log({ splitFilter })
        return (
          order.uuid.toString().toUpperCase().includes(...splitFilter) ||
          order.customerData.profile.name.display.toString().toUpperCase().includes(...splitFilter)
        )
      })

      setFilteredOrders(filtered)
    }
  }, [orders, filter])

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
        }

        // {
        //   icon: <UserAddOutlined style={sidebarIconStyle} />,
        //   title: 'Generate Fakes',
        //   onClick: () => generateFakeCustomers(100)
        // }
      ]
    }
  ]

  const search = input => {
    const query = typeof input === 'string' ? input : input.target.value
    setFilter(query.toUpperCase())
  }

  const onRowClicked = row => {
    const uuid = row.uuid || row.target.dataset.uuid
    history.push(`/orders/view/${uuid}`)
  }

  const handleOrdersLoaded = (loading, setLoading) => {
    setLoading(!ordersLoaded)
  }

  return (
    <Layout>
      <Helmet>
        <title>{process.env.REACT_APP_SERVICESHOP_NAME || 'OpenRepairShop'} :: Orders</title>
      </Helmet>

      <TopNav />
      <Layout>
        {window.innerWidth > 800 && <Sidebar actions={sidebarActions} />}

        <Layout style={{ padding: '0 24px 24px', minHeight: '100vh' }}>
          <Breadcrumb style={{ margin: '16px 0' }}>
            <Breadcrumb.Item><Link to='/'>{process.env.REACT_APP_SERVICESHOP_NAME || 'Home'}</Link></Breadcrumb.Item>
            <Breadcrumb.Item>Orders</Breadcrumb.Item>
          </Breadcrumb>

          {!ordersLoaded && <Loader text='Loading orders, just a moment!' effect={handleOrdersLoaded} />}
          {
            ordersLoaded &&
              <DataTable
                title='Orders'
                className='animate__animated animate__slideInUp animate__faster'
                columns={[
                  { name: 'Short ID', sortable: true, selector: 'uuid', cell: row => <span data-uuid={row.uuid} className='mono transform-upper' onClick={e => onRowClicked(e)}>{row.uuid.split('-')[0]}</span> },
                  { name: 'Customer', sortable: true, selector: 'customerData.profile.name.display', cell: row => <span data-uuid={row.uuid} onClick={e => onRowClicked(e)}>{row.customerData.profile.name.display}</span> },
                  { name: 'Created', sortable: true, selector: 'createdAt', cell: row => <span data-uuid={row.uuid} onClick={e => onRowClicked(e)}>{moment(row.createdAt).format('YYYY-MM-DD HH:mm A')}</span> },
                  { name: 'Updated', sortable: true, selector: 'updatedAt', cell: row => <span data-uuid={row.uuid} onClick={e => onRowClicked(e)}>{moment(row.updatedAt).format('YYYY-MM-DD HH:mm A')}</span> },
                  { name: 'Status', sortable: true, selector: 'status', cell: row => <span data-uuid={row.uuid} onClick={e => onRowClicked(e)}>{row.status.charAt(0).toUpperCase() + row.status.slice(1)}</span> }
                ]}
                conditionalRowStyles={[
                  {
                    when: row => row.status === 'pending',
                    style: { backgroundColor: '#ff5733', color: 'white' }
                  },

                  {
                    when: row => row.status === 'complete',
                    style: { backgroundColor: '#ffb833', color: 'white' }
                  },

                  {
                    when: row => row.status === 'delivered',
                    style: { backgroundColor: '#24bd65', color: 'white' }
                  }
                ]}
                data={filteredOrders}
                defaultSortField='createdAt'
                defaultSortDesc
                dense
                paginationPerPage={15}
                selectableRows={false}
                onRowClicked={onRowClicked}
                highlightOnHover
                pointerOnHover
                pagination
                subHeader
                subHeaderAlign='left'
                subHeaderComponent={
                  <>
                    <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                      <Col className='gutter-row customer-list-action-button'>
                        <Button type='primary' onClick={() => history.push('/orders/new')}>
                          <UserAddOutlined style={{ position: 'relative', top: '-3px' }} />
                          New Order
                        </Button>
                      </Col>

                      <Col className='gutter-row customer-list-action-button'>
                        <Button type='ghost' onClick={forceRefresh}>
                          <ReloadOutlined style={{ position: 'relative', top: '-3px' }} />
                          Force Refresh
                        </Button>
                      </Col>

                      <Col className='gutter-row customer-list-action-button'>
                        <Input.Search placeholder='Search orders' type='search' style={{ width: 200 }} onChange={search} onSearch={search} />
                      </Col>
                    </Row>
                  </>
                }
              />
          }
        </Layout>
      </Layout>
    </Layout>
  )
}

export default Orders
