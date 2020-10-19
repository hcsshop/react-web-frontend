import React, { useState, useEffect } from 'react'
import { Layout, Breadcrumb, message } from 'antd'
import { BarsOutlined, UserDeleteOutlined, UserAddOutlined, EditOutlined } from '@ant-design/icons'
import { Link, useParams, useHistory } from 'react-router-dom'
import Helmet from 'react-helmet'

import TopNav from '../TopNav/TopNav'
import Sidebar from '../Sidebar/Sidebar'
import CustomerCard from './CustomerCard'
import client from '../../feathers/client'
import { deleteCustomer } from '../../helpers'
import Loader from '../Loader/Loader'

const ViewCustomer = () => {
  const history = useHistory()

  const { uuid } = useParams()
  const [customer, setCustomer] = useState(null)
  const [customerLoaded, setCustomerLoaded] = useState(false)

  useEffect(() => {
    const getCustomer = async uuid => {
      try {
        const data = await client.service('customers').get(uuid)
        setCustomer(data)
        setCustomerLoaded(true)
      } catch (err) {
        console.error(err)
        message.error('An error occurred loading this customer. Please try again.')
        setCustomer(null)
        setCustomerLoaded(true)
      }
    }

    if (!customerLoaded) getCustomer(uuid)
  }, [customerLoaded, uuid])

  const sidebarIconStyle = { position: 'relative', top: '-3px' }

  const sidebarActions = [
    {
      icon: <BarsOutlined />,
      title: 'Common Tasks',

      items: [
        {
          icon: <UserAddOutlined style={sidebarIconStyle} />,
          title: 'New Customer',
          onClick: () => history.push('/customers/new')
        },
        {
          icon: <EditOutlined style={sidebarIconStyle} />,
          title: 'Edit Customer',
          onClick: () => history.push(`/customers/edit/${customer.uuid}`)
        },
        {
          icon: <UserDeleteOutlined style={sidebarIconStyle} />,
          title: 'Delete Customer',
          onClick: async () => deleteCustomer({ customer, history, qbEnabled: (await client.service('settings').get('quickbooks.enabled')).enabled })
        }
      ]
    }
  ]

  return (
    <Layout>
      {
        customer &&
          <Helmet>
            <title>{process.env.REACT_APP_SERVICESHOP_NAME || 'OpenRepairShop'} :: Customer :: {customer.profile.name.display}</title>
          </Helmet>
      }

      <TopNav />
      <Layout>
        {window.innerWidth > 800 && <Sidebar actions={sidebarActions} />}

        <Layout style={{ padding: '0 24px 24px', minHeight: '100vh' }}>
          {
            customerLoaded &&
              <Breadcrumb style={{ margin: '16px 0' }}>
                <Breadcrumb.Item><Link to='/'>{process.env.REACT_APP_SERVICESHOP_NAME || 'Home'}</Link></Breadcrumb.Item>
                <Breadcrumb.Item><Link to='/customers'>Customers</Link></Breadcrumb.Item>
                <Breadcrumb.Item>
                  {customer && customer.profile.name.display}
                  {customer && customer.profile.company.isCompany && <em className='ml-2'>({customer.profile.company.name})</em>}
                </Breadcrumb.Item>
              </Breadcrumb>
          }

          {!customerLoaded && <Loader text='Loading customer..' />}
          {customer && <CustomerCard customer={customer} />}
        </Layout>
      </Layout>
    </Layout>
  )
}

export default ViewCustomer
