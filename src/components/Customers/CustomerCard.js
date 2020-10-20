/* eslint-disable react/prop-types */

import React, { useEffect, useState } from 'react'
import parseAddress from 'parse-address'
import { Link, useHistory } from 'react-router-dom'
import { Card, PageHeader, Collapse, List, Row, Col, Tag, Typography, message } from 'antd'
import moment from 'moment'

import {
  PhoneOutlined, EnvironmentOutlined, DesktopOutlined, FileDoneOutlined, DashboardOutlined, MailOutlined,
  AimOutlined, QrcodeOutlined, CalendarOutlined, BugOutlined, AuditOutlined, UserDeleteOutlined, EditOutlined
} from '@ant-design/icons'

import { formatNumber, deleteCustomer } from '../../helpers'
import { generateQRCode, showQRCode } from '../QRCode/QRCode'
import client from '../../feathers/client'

const { Panel } = Collapse
const { Text } = Typography

const CustomerCard = props => {
  const history = useHistory()

  const [customer, setCustomer] = useState(props.customer)
  const [customerQRCode, setCustomerQRCode] = useState()
  const [appointments, setAppointments] = useState([])
  const [appointmentsLoaded, setAppointmentsLoaded] = useState(false)
  const [orders, setOrders] = useState([])
  const [ordersLoaded, setOrdersLoaded] = useState(false)
  const [machines, setMachines] = useState([])
  const [machinesLoaded, setMachinesLoaded] = useState(false)

  const [innerWidth, setInnerWidth] = useState(window.innerWidth)
  window.addEventListener('resize', () => setInnerWidth(window.innerWidth))

  const cardTitle = <span>{customer.profile.name.display}</span>
  let cardSubtitle
  if (customer.profile.company.isCompany) cardSubtitle = <small className='text-muted font-italic'>{customer.profile.company.name}</small>

  const snapCustomerCoordinates = () => {
    console.log('getting gps data')
    if (!navigator.geolocation) {
      message.error('Unfortunately, geolocation is not available or allowed on your browser or device.')
    } else {
      navigator.geolocation.getCurrentPosition(async position => {
        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        }

        const result = await client.service('customers').patch(customer.uuid, { 'profile.address.coordinates': coordinates })
        console.log({ setCustomerCoordinates: result.profile.address.coordinates })
        setCustomer(result)
        message.success("Successfully saved customer's GPS coordinates")
      }, err => {
        if (err) {
          console.error(err)
          message.error('An error occurred getting the GPS coordinates.')
        }
      })
    }
  }

  useEffect(() => {
    setCustomer(props.customer)
  }, [props.customer])

  useEffect(() => {
    setCustomerQRCode(generateQRCode({ value: `C:${customer.uuid}`, size: 128, fgColor: '#000' }))
  }, [customer.uuid])

  useEffect(() => {
    const go = async () => {
      if (!appointmentsLoaded) {
        const results = await client.service('appointments').find({ query: { $limit: -1, customer: customer.uuid, 'spacetime.start': { $gte: Date.now() } } })
        setAppointments(results)
        setAppointmentsLoaded(true)
      }

      if (!ordersLoaded) {
        const results = await client.service('orders').find({ query: { $limit: -1, customer: customer.uuid } })
        setOrders(results)
        setOrdersLoaded(true)
      }

      if (!machinesLoaded) {
        const results = await client.service('machines').find({ query: { $limit: -1, customer: customer.uuid } })
        setMachines(results)
        setMachinesLoaded(true)
      }
    }

    go()
  }, [customer, appointmentsLoaded, ordersLoaded, machinesLoaded])

  const customerActionButtons = []

  customerActionButtons.push(
    // <Button type='link' key={Math.random().toString(36)} style={{ margin: 0 }}>
    <button
      key={Math.random().toString(36)}
      onClick={e => showQRCode({ uuid: customer.uuid, type: 'C', title: `Customer | ${customer.profile.name.display}`, fgColor: '#236e41' })}
      className='customer-action-link'
    >
      <QrcodeOutlined
        className='customer-action-icon qrcode'
        title='View QR Code'
      />
      <strong>Show QR Code</strong>
    </button>
    // </Button>
  )

  customerActionButtons.push(
    <Link key={Math.random().toString()} to={`/appointments/new?customer=${customer.uuid}`} className='customer-action-link'>
      <CalendarOutlined key={Math.random().toString(36)} className='customer-action-icon appointment' title='Schedule Appointment' />
      <strong>Schedule Appointment</strong>
    </Link>
  )

  customerActionButtons.push(
    <Link key={Math.random().toString()} to={`/orders/new?customer=${customer.uuid}`} className='customer-action-link'>
      <AuditOutlined key={Math.random().toString(36)} className='customer-action-icon order' title='New Order' />
      <strong>New Order</strong>
    </Link>
  )

  if (customer.profile.phone && customer.profile.phone.primary && customer.profile.phone.primary.number !== '') {
    customerActionButtons.push(
      <a key={Math.random().toString()} href={`tel:${customer.profile.phone.primary.number}`} className='customer-action-link'>
        <PhoneOutlined key={Math.random().toString(36)} className='customer-action-icon phone' title='Call' />
        <strong>Call</strong>
      </a>
    )
  }

  if (customer.email !== '') {
    customerActionButtons.push(
      <a key={Math.random().toString(36)} href={`mailto:${customer.email}`} className='customer-action-link'>
        <MailOutlined className='customer-action-icon email' title='Email' />
        <strong>Email</strong>
      </a>
    )
  }

  let customerMapQuery

  if (customer.profile.address.coordinates) {
    customerMapQuery = `${customer.profile.address.coordinates.latitude},${customer.profile.address.coordinates.longitude}`
  } else if (customer.profile.address.physical && customer.profile.address.physical !== '') {
    customerMapQuery = customer.profile.address.physical
  } else if (customer.profile.address.billing && customer.profile.address.billing !== '') {
    customerMapQuery = customer.profile.address.billing
  }

  customerMapQuery && customerActionButtons.push(
    <a key={Math.random().toString(36)} href={`https://maps.google.com?q=${customerMapQuery}`} target='_blank' rel='noopener noreferrer' className='customer-action-link'>
      <EnvironmentOutlined className='customer-action-icon map' title='Map' />
      <strong>Map</strong>
    </a>
  )

  customerActionButtons.push(
    <button key={Math.random().toString(36)} onClick={snapCustomerCoordinates} className='customer-action-link'>
      <AimOutlined className='customer-action-icon snap-coordinates' title='Snap GPS Coordinates' />
      <strong>Snap GPS</strong>
    </button>
  )

  customerActionButtons.push(
    <button key={Math.random().toString(36)} onClick={() => history.push(`/customers/edit/${customer.uuid}`)} className='customer-action-link danger-link'>
      <EditOutlined className='customer-action-icon edit' title='Edit' />
      <strong>Edit</strong>
    </button>
  )

  customerActionButtons.push(
    <button key={Math.random().toString(36)} onClick={async () => deleteCustomer(customer.uuid, history, (await client.service('settings').get('quickbooks.enabled')).enabled)} className='customer-action-link danger-link'>
      <UserDeleteOutlined className='customer-action-icon delete' title='Delete' />
      <strong>Delete</strong>
    </button>
  )

  const billingParsed = parseAddress.parseLocation(customer.profile.address.billing)
  const physicalParsed = parseAddress.parseLocation(customer.profile.address.physicalSameAsBilling ? customer.profile.address.billing : customer.profile.address.physical)

  // Sometimes the parser can crap out, so fallback to displaying unparsed
  const billingParsedHasUndefinedCity = billingParsed ? Object.values(billingParsed).every(el => el.city === undefined) : true
  const physicalParsedHasUndefinedCity = physicalParsed ? Object.values(physicalParsed).every(el => el.city === undefined) : true
  // console.log({ billingParsed, physicalParsed, billingParsedHasUndefinedCity, physicalParsedHasUndefinedCity })

  return (
    <Card
      className='customer-card'
      style={{ borderRadius: '10px', borderColor: '#999' }}
      title={
        <div>
          <PageHeader
            title={<span>{cardTitle}{cardSubtitle ? <br /> : null}{cardSubtitle}</span>}
            onBack={() => history.goBack()}
            style={{ marginBottom: '2em' }}
          />
        </div>
      }
      extra={innerWidth && innerWidth > 800 && customerQRCode}
    >
      <Card className='customer-action-card'>
        {
          customerActionButtons && customerActionButtons.length > 0 &&
            <Row>
              {
                customerActionButtons.map(action => {
                  return (
                    <Col key={Math.random().toString(36)} xl={8} lg={8} md={10} sm={12} xs={12} className='customer-action-card-col'>
                      <Card.Grid
                        className='customer-action-card-grid'
                      >
                        {action}
                      </Card.Grid>
                    </Col>
                  )
                })
              }
            </Row>
        }
      </Card>

      <hr />

      <Collapse defaultActiveKey={['1']}>
        <Panel
          key='1'
          header={
            <div className='customer-view-panel-header'>
              <DashboardOutlined />
              <span>Overview</span>
            </div>
          }
        >
          <Row gutter={16} justify='center'>
            <Col xs={24} xl={8} className='gutter-row text-left'>
              <h5>Billing Address</h5>
              <div className='customer-view-address-header'>
                <strong>
                  {
                    customer.profile.name.display
                      ? customer.profile.name.display
                      : `${customer.profile.name.first} ${customer.profile.name.middle + ' ' || ''}${customer.profile.name.last}`
                  }
                </strong>

                {
                  customer.profile.address.billing && billingParsedHasUndefinedCity &&
                    <p>{customer.profile.address.billing}</p>
                }

                {
                  customer.profile.address.billing && !billingParsedHasUndefinedCity &&
                    <div>
                      {`${billingParsed.number || ''} ${billingParsed.street || ''} ${billingParsed.type || ''}`}
                      {
                        billingParsed.sec_unit &&
                        `${billingParsed.sec_unit} ${billingParsed.sec_num}`
                      }
                      <br />
                      {`${billingParsed.city + ', ' || ''}${billingParsed.state || ''} ${billingParsed.zip || ''}`}
                    </div>
                }
              </div>
            </Col>
            <Col xs={24} xl={8} className='gutter-row text-left'>
              <h5>Physical Address</h5>
              <div className='customer-view-address-header'>
                <strong>
                  {
                    customer.profile.name.display
                      ? customer.profile.name.display
                      : `${customer.profile.name.first} ${customer.profile.name.middle + ' ' || ''}${customer.profile.name.last}`
                  }
                </strong>

                {
                  customer.profile.address.physical && physicalParsedHasUndefinedCity &&
                    <p>{customer.profile.address.physical}</p>
                }

                {
                  customer.profile.address.physical && !physicalParsedHasUndefinedCity &&
                    <div>
                      {`${physicalParsed.number || ''} ${physicalParsed.street || ''} ${physicalParsed.type || ''}`}
                      {
                        physicalParsed.sec_unit &&
                        `${physicalParsed.sec_unit} ${physicalParsed.sec_num}`
                      }
                      <br />
                      {`${physicalParsed.city + ', ' || ''}${physicalParsed.state || ''} ${physicalParsed.zip || ''}`}
                    </div>
                }
              </div>
            </Col>
            <Col xs={24} xl={8} className='gutter-row text-left'>
              <h5>Contact Details</h5>
              <div className='customer-view-contact-container'>
                {
                  customer.profile.phone && customer.profile.phone.primary && customer.profile.phone.primary.number !== '' &&
                    <>
                      <PhoneOutlined />
                      <strong>Phone Number</strong>
                      <br />
                      <Text copyable>
                        {formatNumber(customer.profile.phone.primary.number)}
                      </Text>
                      <br />
                    </>
                }

                <MailOutlined />
                <strong>Email Address</strong>
                <br />
                <Text copyable>{customer.email}</Text>
                <br />

                {
                  customer.profile.phone && customer.profile.phone.mobile && customer.profile.phone.mobile.number !== '' &&
                    <>
                      <PhoneOutlined />
                      <strong>Mobile Number</strong>
                      <br />
                      <Text copyable>{formatNumber(customer.profile.phone.mobile.number)}</Text>
                      <br />
                    </>
                }

                {
                  customer.profile.phone && customer.profile.phone.fax && customer.profile.phone.fax.number !== '' &&
                    <>
                      <PhoneOutlined />
                      <strong>Fax Number</strong>
                      <br />
                      <Text copyable>{formatNumber(customer.profile.phone.fax.number)}</Text>
                      <br />
                    </>
                }
              </div>
            </Col>
          </Row>
        </Panel>
        <Panel
          key='2'
          header={
            <div className='customer-view-panel-header'>
              <CalendarOutlined />
              <span>Appointments</span>
              {appointmentsLoaded && <span className='float-right'><Tag color={appointments.length > 0 ? 'red' : 'green'}>{appointments.length}</Tag></span>}
            </div>
          }
        >
          <List
            size='small'
            header={<strong>{appointments.length} Upcoming {appointments.length === 1 ? 'Appointment' : 'Appointments'}</strong>}
            bordered
            renderItem={item => <List.Item>{item}</List.Item>}
            dataSource={
              appointments.map(appt => {
                return (
                  <span key={Math.random().toString(36)}>
                    <Link to={`/appointments/view/${appt.uuid}`}>
                      {appt.title} &bull; {moment(appt.spacetime.start).format('dddd, MMMM Do YYYY h:mm A')}
                    </Link>
                  </span>
                )
              })
            }
          />
        </Panel>
        <Panel
          key='3'
          header={
            <div className='customer-view-panel-header'>
              <AuditOutlined />
              <span>Orders</span>
              {ordersLoaded && <span className='float-right'><Tag color={orders.length > 0 ? 'red' : 'green'}>{orders.length}</Tag></span>}
            </div>
          }
        >
          <List
            size='small'
            header={<strong>{orders.length} {orders.length === 1 ? 'Order' : 'Orders'}</strong>}
            bordered
            renderItem={item => <List.Item>{item}</List.Item>}
            dataSource={
              orders.map(order => {
                return (
                  <span key={Math.random().toString(36)}>
                    <Link to={`/orders/view/${order.uuid}`}>
                      <span className='mono'>{order.uuid.split('-')[0].toUpperCase()}</span> &bull; {moment(order.createdAt).format('dddd, MMMM Do YYYY h:mm A')}
                    </Link>
                  </span>
                )
              })
            }
          />
        </Panel>
        <Panel
          key='4'
          header={
            <div className='customer-view-panel-header'>
              <DesktopOutlined />
              <span>Machines</span>
              {machinesLoaded && <span className='float-right'><Tag color={machines.length > 0 ? 'red' : 'green'}>{machines.length}</Tag></span>}
            </div>
          }
        >
          <List
            size='small'
            header={<strong>{machines.length} {machines.length === 1 ? 'Machine' : 'Machines'}</strong>}
            bordered
            renderItem={item => <List.Item>{item}</List.Item>}
            dataSource={
              machines.map(machine => {
                return (
                  <span key={Math.random().toString(36)}>
                    <Link to={`/machines/view/${machine.uuid}`}>
                      <span className='mono'>{machine.uuid}</span>
                      <p style={{ marginLeft: '1.5em' }}>&bull; {machine.manufacturer} {machine.model} (Serial: {machine.serial})</p>
                    </Link>
                  </span>
                )
              })
            }
          />
        </Panel>
        <Panel
          key='5'
          header={
            <div className='customer-view-panel-header'>
              <FileDoneOutlined />
              <span>Documents</span>
              <span className='float-right'><Tag color='blue'>3</Tag></span>
            </div>
          }
        >
          docs
        </Panel>
        <Panel
          key='6'
          header={
            <div className='customer-view-panel-header'>
              <BugOutlined />
              <span>Raw Data</span>
            </div>
          }
        >
          <pre>{JSON.stringify(customer, null, 2)}</pre>
        </Panel>
      </Collapse>
    </Card>
  )
}

export default CustomerCard
