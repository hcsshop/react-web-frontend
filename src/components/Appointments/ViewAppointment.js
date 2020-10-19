import React, { useState, useEffect } from 'react'
import { Layout, Button, Breadcrumb, Card, PageHeader, Row, Col, Typography, message } from 'antd'
import { BarsOutlined, UserDeleteOutlined, UserAddOutlined, EditOutlined, EnvironmentOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { Link, useParams, useHistory } from 'react-router-dom'
import Helmet from 'react-helmet'
import Countdown from 'react-countdown'
import moment from 'moment'

import TopNav from '../TopNav/TopNav'
import Sidebar from '../Sidebar/Sidebar'
import client from '../../feathers/client'
import Loader from '../Loader/Loader'

import { showQRCode } from '../QRCode/QRCode'

const { Text } = Typography

const ViewAppointment = () => {
  const history = useHistory()

  const { uuid } = useParams()
  const [appointment, setAppointment] = useState(null)
  const [appointmentLoaded, setAppointmentLoaded] = useState(false)
  const [appointmentLocationData, setAppointmentLocationData] = useState(false)
  const [appointmentsOrigin, setAppointmentsOrigin] = useState(false)
  const [federalMileageRate, setFederalMileageRate] = useState(null)

  // A little workaround for react-places-autocomplete to handle async loading of maps js api
  const [windowGoogle, setWindowGoogle] = useState(null) // eslint-disable-line
  const googleApiWatcher = setInterval(() => {
    if (window.google) {
      setWindowGoogle(window.google)
      clearInterval(googleApiWatcher)
    }
  }, 500)

  useEffect(() => {
    const go = async () => {
      try {
        const result = await client.service('settings').get('mileage.rate')
        setFederalMileageRate(result.number)
      } catch (err) {
        setFederalMileageRate(0.575) // 2020 rate used as fallback
      }
    }

    if (!federalMileageRate) go()
  }, [federalMileageRate])

  useEffect(() => {
    const getAppointment = async uuid => {
      try {
        const data = await client.service('appointments').get(uuid)
        setAppointment(data)
        setAppointmentLoaded(true)
      } catch (err) {
        console.error(err)
        message.error('An error occurred loading this appointment. Please try again.')
        setAppointment(null)
        setAppointmentLoaded(true)
      }
    }

    if (!appointmentLoaded) getAppointment(uuid)
  }, [appointmentLoaded, uuid])

  useEffect(() => {
    const go = async () => {
      if (!appointment || !appointmentLoaded) return false

      if (!appointmentsOrigin) {
        try {
          const result = await client.service('settings').get('appointments.origin')
          setAppointmentsOrigin(result.text)
        } catch (err) {
          console.error(err)
          setAppointmentsOrigin(null)
        }
      }

      if (window.google && appointmentLoaded && appointmentsOrigin) {
        const DirectionsService = new window.google.maps.DirectionsService()
        const DirectionsRenderer = new window.google.maps.DirectionsRenderer()

        DirectionsService.route({
          origin: appointmentsOrigin,
          destination: appointment.spacetime.location,
          travelMode: window.google.maps.TravelMode.DRIVING
        }, (result, status) => {
          if (status !== 'OK') return false
          const route = result.routes[0]
          const { legs } = route

          let distanceMeters = 0
          let durationSeconds = 0
          legs.forEach(leg => { distanceMeters += leg.distance.value })
          legs.forEach(leg => { durationSeconds += leg.duration.value })

          const data = {
            via: route.summary,
            route,
            durationSeconds,
            distanceMeters,
            distanceMiles: Math.ceil(distanceMeters * 0.00062137)
          }

          setAppointmentLocationData(data)
          const map = new window.google.maps.Map(document.getElementById('appointment-map'), { center: data.route.legs[0].start_location })

          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <p><strong>Via ${data.via}, this trip is ${Math.ceil(data.distanceMiles)}
              ${Math.ceil(data.distanceMiles) === 1 ? ' mile ' : ' miles '}
              and will take ${moment.duration(data.durationSeconds * 1000).humanize()}</strong></p>

              <p>Cost at Federal Mileage Rate: $${(data.distanceMiles * federalMileageRate).toFixed(2)}</p>
            `
          })

          DirectionsRenderer.setMap(map)
          DirectionsRenderer.setDirections(result)

          infoWindow.open(map, new window.google.maps.Marker({ map, title: appointment.title, position: route.legs[0].end_location }))
        })
      }
    }

    go()
  }, [appointment, appointmentsOrigin, appointmentLoaded, federalMileageRate])

  // useEffect(() => {
  //   return () => { window.google = null; setWindowGoogle(null) }
  // }, [])

  const sidebarIconStyle = { position: 'relative', top: '-3px' }

  const sidebarActions = [
    {
      icon: <BarsOutlined />,
      title: 'Common Tasks',

      items: [
        {
          icon: <UserAddOutlined style={sidebarIconStyle} />,
          title: 'New Appointment',
          onClick: () => history.push('/appointments/new')
        },
        {
          icon: <EditOutlined style={sidebarIconStyle} />,
          title: 'Edit Appointment',
          onClick: () => history.push(`/appointments/edit/${appointment.uuid}`)
        },
        {
          icon: <UserDeleteOutlined style={sidebarIconStyle} />,
          title: 'Delete Appointment',
          onClick: async () => console.log('Would delete!')
        }
      ]
    }
  ]

  return (
    <Layout>
      {
        appointment &&
          <Helmet>
            <title>{process.env.REACT_APP_SERVICESHOP_NAME || 'OpenRepairShop'} :: Appointment :: {appointment.title}</title>
          </Helmet>
      }

      <TopNav />
      <Layout>
        {window.innerWidth > 800 && <Sidebar actions={sidebarActions} />}

        <Layout style={{ padding: '0 24px 24px', minHeight: '100vh' }}>
          {
            appointmentLoaded &&
              <Breadcrumb style={{ margin: '16px 0' }}>
                <Breadcrumb.Item><Link to='/'>{process.env.REACT_APP_SERVICESHOP_NAME || 'Home'}</Link></Breadcrumb.Item>
                <Breadcrumb.Item><Link to='/appointments'>Appointments</Link></Breadcrumb.Item>
                <Breadcrumb.Item><Link to={`/appointments/view/${appointment.uuid}`}>{appointment.uuid.split('-')[0]}</Link></Breadcrumb.Item>
                <Breadcrumb.Item>
                  {appointment.customer && appointment.customer !== '' && <Link to={`/customers/view/${appointment.customer}`}>{appointment.title}</Link>}
                  {(!appointment.customer || appointment.customer === '') && appointment.title}
                </Breadcrumb.Item>
                <Breadcrumb.Item>
                  {moment(appointment.spacetime.start).format('YYYY-MM-DD HH:mm')} - {moment(appointment.spacetime.end).format('YYYY-MM-DD HH:mm')}
                </Breadcrumb.Item>
              </Breadcrumb>
          }

          {!appointmentLoaded && <Loader text='Loading appointment..' />}

          {
            appointmentLoaded && appointmentsOrigin &&
              <Card>
                <PageHeader
                  title={
                    <>
                      <span>
                        {
                          appointment.customer
                            ? <Link to={`/customers/view/${appointment.customer}`}>{appointment.title}</Link>
                            : appointment.title
                        }
                        <br />
                        <small>{moment(appointment.spacetime.start).fromNow()} ({moment(appointment.spacetime.start).calendar()})</small>
                        <br />
                        <Button type='link' onClick={e => showQRCode({ uuid: appointment.uuid, type: 'A', title: `Appointment | ${moment(appointment.spacetime.start).format('YYYY-MM-DD HH:mm')}` })}>View QR Code</Button>
                      </span>
                    </>
                  }
                  onBack={() => history.goBack()}
                  extra={
                    <span className='appointment-countdown-timer'>
                      <p className='countdown'><Countdown date={moment(appointment.spacetime.start).valueOf()} /></p>
                      <p>{moment(appointment.spacetime.start).format('dddd, MMMM Do YYYY')}</p>
                      <p>{moment(appointment.spacetime.start).format('h:mm A')}</p>
                    </span>
                  }
                />

                <hr />

                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }} style={{ marginTop: '2em', fontSize: '1.5em' }}>
                  <Col className='gutter-row text-center' xs={24} xl={8} style={{ marginBottom: '2em' }}>
                    <h3>Start</h3>
                    <p>{moment(appointment.spacetime.start).format('dddd, MMMM Do YYYY, h:mm A')}</p>
                  </Col>

                  <Col className='gutter-row text-center' xs={24} xl={8} style={{ marginBottom: '2em' }}>
                    <ArrowRightOutlined style={{ fontSize: '2em' }} />
                  </Col>

                  <Col className='gutter-row text-center' xs={24} xl={8} style={{ marginBottom: '2em' }}>
                    <h4>End</h4>
                    <p>{moment(appointment.spacetime.end).format('dddd, MMMM Do YYYY, h:mm A')}</p>
                  </Col>
                </Row>

                <hr />
                {
                  appointment.description && appointment.description !== '' &&
                    <>
                      <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }} style={{ fontSize: '2em' }}>
                        <Col className='gutter-row text-center' xs={24} xl={24}>
                          <blockquote>{appointment.description}</blockquote>
                        </Col>
                      </Row>

                      <hr />
                    </>
                }

                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }} style={{ fontSize: '2em' }}>
                  <Col className='gutter-row text-center' xs={24} xl={24}>
                    <h2>
                      <Text copyable>{appointment.spacetime.location}</Text>
                      <a key={Math.random().toString(36)} href={`https://maps.google.com?q=${appointment.spacetime.location}`} target='_blank' rel='noopener noreferrer'>
                        <EnvironmentOutlined title='Map' />
                      </a>
                    </h2>
                  </Col>
                </Row>

                {
                  appointmentLocationData &&
                    <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                      <Col className='gutter-row text-center' xs={24} xl={24} style={{ marginBottom: '2em' }}>
                        {<div id='appointment-map' />}
                      </Col>
                    </Row>
                }

                {/* <hr /> */}

                {/* <pre>{JSON.stringify(appointment, null, 2)}</pre> */}
              </Card>
          }
        </Layout>
      </Layout>
    </Layout>
  )
}

export default ViewAppointment
