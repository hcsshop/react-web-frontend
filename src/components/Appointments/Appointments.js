import React, { useState, useEffect } from 'react'
import { Link, useHistory } from 'react-router-dom'
import { Layout, Breadcrumb, Row, Col, Button, message } from 'antd'
import { BarsOutlined, CalendarOutlined, PlusOutlined } from '@ant-design/icons'
import Helmet from 'react-helmet'
import FullCalendar from '@fullcalendar/react'
import FullCalendarPluginDayGrid from '@fullcalendar/daygrid'
import FullCalendarPluginTimeGrid from '@fullcalendar/timegrid'
import FullCalendarPluginTimeline from '@fullcalendar/timeline'
import moment from 'moment'

import TopNav from '../TopNav/TopNav'
import Sidebar from '../Sidebar/Sidebar'
import Loader from '../Loader/Loader'

import client from '../../feathers/client'

const Appointments = () => {
  const history = useHistory()

  const [appointments, setAppointments] = useState([])
  const [appoinmentsLoaded, setAppointmentsLoaded] = useState(false)

  useEffect(() => {
    const go = async () => {
      if (!appoinmentsLoaded) {
        console.log('Loading appointments')
        try {
          const results = await client.service('appointments').find({ query: { $limit: -1 } })
          setAppointments(results)
          setAppointmentsLoaded(true)
        } catch (err) {
          console.error(err)
          message.error('An error occurred loading appointments. Please try again.')
        }
      }
    }

    go()
  }, [appoinmentsLoaded])

  const sidebarIconStyle = { position: 'relative', top: '-3px' }

  const sidebarActions = [
    {
      icon: <BarsOutlined />,
      title: 'Common Tasks',

      items: [
        {
          icon: <CalendarOutlined style={sidebarIconStyle} />,
          title: 'New Appointment',
          onClick: () => history.push('/appointments/new')
        }
      ]
    }
  ]

  const eventClick = info => {
    const { event } = info
    const details = event._def
    console.log(details, event)
    history.push(`/appointments/view/${details.publicId}`)
  }

  return (
    <Layout>
      <Helmet>
        <title>{process.env.REACT_APP_SERVICESHOP_NAME || 'OpenRepairShop'} :: Appointments</title>
      </Helmet>

      <TopNav />
      <Layout>
        {window.innerWidth > 800 && <Sidebar actions={sidebarActions} />}

        <Layout style={{ padding: '0 24px 24px', minHeight: '100vh' }}>
          <Breadcrumb style={{ margin: '16px 0' }}>
            <Breadcrumb.Item><Link to='/'>{process.env.REACT_APP_SERVICESHOP_NAME || 'Home'}</Link></Breadcrumb.Item>
            <Breadcrumb.Item>Appointments</Breadcrumb.Item>
          </Breadcrumb>

          {!appoinmentsLoaded && <Loader text='Loading appointments, just a moment!' />}

          {
            appoinmentsLoaded &&
              <div className='animate__animated animate__slideInUp animate__faster'>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                  <Col className='gutter-row customer-list-action-button'>
                    <Button type='primary' onClick={() => history.push('/appointments/new')}>
                      <PlusOutlined style={{ position: 'relative', top: '-3px' }} />
                      New Appointment
                    </Button>
                  </Col>

                  {/* <Col className='gutter-row customer-list-action-button'>
                    <Input.Search placeholder='Search appointments' type='search' style={{ width: 200 }} />
                  </Col> */}
                </Row>
                <hr />
                <FullCalendar
                  defaultView='dayGridWeek'
                  hiddenDays={[6, 1, 0]}
                  // timeZone={process.env.TIMEZONE || state.timezone || 'America/Chicago'}
                  eventClick={eventClick}
                  plugins={[FullCalendarPluginDayGrid, FullCalendarPluginTimeGrid, FullCalendarPluginTimeline]}
                  events={
                    appointments.map(appt => {
                      return {
                        id: appt.uuid,
                        title: appt.title,
                        start: moment(appt.spacetime.start).toDate(),
                        end: moment(appt.spacetime.end).toDate()
                      }
                    })
                  }
                />
              </div>
          }
        </Layout>
      </Layout>
    </Layout>
  )
}

export default Appointments
