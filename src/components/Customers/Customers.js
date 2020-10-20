/* global localStorage */

import React, { useState, useEffect } from 'react'
import { Layout, Breadcrumb, Row, Col, Input, Button, message } from 'antd'
import { BarsOutlined, UserAddOutlined, SyncOutlined, ReloadOutlined } from '@ant-design/icons'
import { useHistory } from 'react-router-dom'
import DataTable from 'react-data-table-component'
import Helmet from 'react-helmet'

import Loader from '../Loader/Loader'
import TopNav from '../TopNav/TopNav'
import Sidebar from '../Sidebar/Sidebar'
import client from '../../feathers/client'
import { formatNumber } from '../../helpers'

const Customers = () => {
  const history = useHistory()

  const [customers, setCustomers] = useState([])
  const [filteredCustomers, setFilteredCustomers] = useState([])
  const [customersLoaded, setCustomersLoaded] = useState(false)
  const [syncRunning, setSyncRunning] = useState(false)
  const [filter, setFilter] = useState('')
  const [quickbooksEnabled, setQuickbooksEnabled] = useState(false)

  // const generateFakeCustomers = async (amount = 1) => {
  //   console.log(`Generating ${amount} fake customers`)

  //   const customers = new Array(amount).fill(null).map(() => ({
  //     email: faker.internet.email(),
  //     profile: {
  //       notes: 'A fake customer generated for testing purposes',

  //       name: {
  //         first: faker.name.firstName(),
  //         middle: `${faker.name.firstName().split('')[0]}.`,
  //         last: faker.name.lastName()
  //       },

  //       address: {
  //         billing: `${faker.address.streetAddress()}, ${faker.address.city()}, ${faker.address.stateAbbr()}, ${faker.address.zipCode()}`
  //       },

  //       phone: {
  //         primary: { number: faker.phone.phoneNumber() },
  //         mobile: { number: faker.phone.phoneNumber() },
  //         fax: { number: faker.phone.phoneNumber() }
  //       },

  //       company: {
  //         isCompany: faker.random.boolean(),
  //         name: faker.company.companyName(),
  //         taxId: faker.random.number(),
  //         taxExempt: faker.random.boolean(),
  //         contact: faker.name.findName(),
  //         email: faker.internet.email(),
  //         website: faker.internet.url()
  //       }
  //     }
  //   }))

  //   await client.service('customers').create(customers)
  //   forceRefresh()
  // }

  // Get setting quickbooks.enabled
  useEffect(() => {
    const go = async () => {
      const qbEnabled = (await client.service('settings').get('quickbooks.enabled')).enabled
      setQuickbooksEnabled(qbEnabled)
    }

    go()
  })

  useEffect(() => {
    client.service('quickbooks').timeout = 10000
    client.service('customers').timeout = 15000

    const getCustomers = async () => {
      if (customersLoaded) return customers

      try {
        const customers = await client.service('customers').find({ query: { $limit: -1 } })
        localStorage.setItem('customers', JSON.stringify({ updated: Date.now(), customers }))
        setCustomers(customers)
        setCustomersLoaded(true)
      } catch (err) {
        console.error(err)
        message.error('An error occurred loading customers. Please try again later.')
        setCustomers([])
        setCustomersLoaded(true)
      }
    }

    if (!customersLoaded) {
      let localCustomers

      try {
        localCustomers = JSON.parse(localStorage.getItem('customers'))
      } catch (e) {
        localCustomers = null
      }

      if (localCustomers) {
        const diff = Date.now() - localCustomers.updated
        if (diff >= (process.env.REACT_APP_CACHE_CUSTOMERS_MS || 1800000)) {
          console.warn('Expiring cached customers')
          forceRefresh()
        } else {
          console.log('Loading customers from cache')
          setCustomers(localCustomers.customers)
          setCustomersLoaded(true)
        }
      } else {
        getCustomers()
      }
    }
  }, [customers, customersLoaded])

  useEffect(() => {
    if (filter === '') {
      setFilteredCustomers(customers)
    } else {
      const filtered = customers.filter(customer => {
        try {
          const splitFilter = filter.split(' ')
          try {
            return (
              customer.uuid.toString().toUpperCase().includes(...splitFilter) ||
              (typeof customer.profile.name.first === 'string' && customer.profile.name.first.toUpperCase().includes(...splitFilter)) ||
              (typeof customer.profile.name.last === 'string' && customer.profile.name.last.toUpperCase().includes(...splitFilter)) ||
              (typeof customer.profile.company.name === 'string' && customer.profile.company.name.toUpperCase().includes(...splitFilter)) ||
              (customer.profile.phone.primary && customer.profile.phone.primary.number && customer.profile.phone.primary.number.includes(...splitFilter)) ||
              (customer.profile.phone.mobile && customer.profile.phone.mobile.number && customer.profile.phone.mobile.number.includes(...splitFilter))
            )
          } catch (err) {
            console.warn(err)
            return false
          }
        } catch (err) {
          console.error(err)
          return false
        }
      })

      setFilteredCustomers(filtered)
    }
  }, [customers, filter])

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
    history.push(`/customers/view/${row.uuid}`)
  }

  const syncWithQuickbooks = async () => {
    console.log('Syncing with Quickbooks..')
    let result

    client.service('quickbooks').timeout = 120000
    setSyncRunning(true)

    try {
      result = await client.service('quickbooks').patch('customers', { sync: 'merge' })
    } catch (err) {
      console.error('[QBO:SyncCustomers] Sync error', { metadata: { err } })
      message.error('Error syncing customers! Please try again.', 10)
      setSyncRunning(false)
    }

    client.service('quickbooks').timeout = 10000
    console.log('Sync Result:', result)

    if (!result || result.error) {
      console.error('[QBO:SyncCustomers] Sync error', { metadata: { result } })
      message.error('Error syncing customers! Please try again.', 10)
      setSyncRunning(false)
    } else {
      message.success(`Downloaded: ${result.downloaded}, Updated: ${result.updated}, Uploaded: ${result.uploaded}`)
      forceRefresh()
      setSyncRunning(false)
    }
  }

  const handleCustomersLoaded = (loading, setLoading) => {
    setLoading(!customersLoaded)
  }

  const forceRefresh = async () => {
    localStorage.removeItem('customers')
    setCustomers([])
    setCustomersLoaded(false)
    const customers = await client.service('customers').find({ query: { $limit: -1 } })
    localStorage.setItem('customers', JSON.stringify({ updated: Date.now(), customers }))
    setCustomers(customers)
    setCustomersLoaded(true)
  }

  return (
    <Layout>
      <Helmet>
        <title>{process.env.REACT_APP_SERVICESHOP_NAME || 'OpenRepairShop'} :: Customers</title>
      </Helmet>

      <TopNav />
      <Layout>
        {window.innerWidth > 800 && <Sidebar actions={sidebarActions} />}

        <Layout style={{ padding: '0 24px 24px', minHeight: '100vh' }}>
          <Breadcrumb style={{ margin: '16px 0' }}>
            <Breadcrumb.Item>{process.env.REACT_APP_SERVICESHOP_NAME || 'Home'}</Breadcrumb.Item>
            <Breadcrumb.Item>Customers</Breadcrumb.Item>
          </Breadcrumb>

          {syncRunning && <Loader text='Syncing, hang tight!' />}
          {!customersLoaded && <Loader text='Loading customers, just a moment!' effect={handleCustomersLoaded} />}
          {
            customersLoaded && !syncRunning &&
              <DataTable
                title='Customers'
                className='animate__animated animate__slideInUp animate__faster'
                striped
                columns={[
                  { name: 'Short ID', sortable: true, cell: row => <span className='mono transform-upper'>{row.uuid.split('-')[0]}</span> },
                  { name: 'First Name', selector: 'profile.name.first', sortable: true },
                  { name: 'Last Name', selector: 'profile.name.last', sortable: true },
                  {
                    name: 'Company Name',
                    selector: 'profile.company.name',
                    sortable: true,
                    cell: row => {
                      return <span>{row.profile.company && row.profile.company.isCompany ? row.profile.company.name : ''}</span>
                    }
                  },
                  {
                    name: 'Primary Phone',
                    selector: 'profile.phone.primary.number',
                    cell: row => {
                      return <span className='mono'>{formatNumber(row.profile.phone.primary.number)}</span>
                    }
                  }
                  // ,
                  // {
                  //   name: 'Customer Since',
                  //   sortable: true,
                  //   cell: row => {
                  //     return <span>{moment(row.timestamps.customerSince).format(state.dateFormat || 'MM/DD/YYYY')} <em><small>({moment(row.timestamps.customerSince).fromNow()})</small></em></span>
                  //   }
                  // }
                ]}
                data={filteredCustomers}
                defaultSortField='profile.name.last'
                defaultSortAsc
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
                        <Button type='primary' onClick={() => history.push('/customers/new')}>
                          <UserAddOutlined style={{ position: 'relative', top: '-3px' }} />
                          New Customer
                        </Button>
                      </Col>

                      <Col className='gutter-row customer-list-action-button'>
                        <Button type='ghost' onClick={forceRefresh}>
                          <ReloadOutlined style={{ position: 'relative', top: '-3px' }} />
                          Force Refresh
                        </Button>
                      </Col>

                      {
                        quickbooksEnabled &&
                          <Col className='gutter-row customer-list-action-button'>
                            <Button type='ghost' onClick={syncWithQuickbooks}>
                              <SyncOutlined style={{ position: 'relative', top: '-3px' }} />
                              Sync with QuickBooks
                            </Button>
                          </Col>
                      }

                      <Col className='gutter-row customer-list-action-button'>
                        <Input.Search placeholder='Search customers' type='search' style={{ width: 200 }} onChange={search} onSearch={search} />
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

export default Customers
