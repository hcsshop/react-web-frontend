import React from 'react'
import { Link, useHistory } from 'react-router-dom'
import { Card, Tag } from 'antd'
import { CalendarOutlined } from '@ant-design/icons'
import Countdown from 'react-countdown'
import moment from 'moment'

const AppointmentCard = ({ appointment }) => {
  const history = useHistory()

  return (
    <Card
      className='dashboard-card'
      title={<div className='dashboard-card-title'><strong>{appointment.title}</strong></div>}
      style={{ borderRadius: '3px', borderColor: '#999' }}
      extra={[
        <Tag key='appt-card-fuzzytime-tag' color='blue'>
          <em>{moment(appointment.spacetime.start).fromNow()}</em>
        </Tag>,
        <Tag key='appt-card-countdown-tag' color='magenta'>
          <strong>
            <Countdown date={moment(appointment.spacetime.start).valueOf()} />
          </strong>
        </Tag>
      ]}
      actions={[
        <CalendarOutlined key={Math.random().toString(36)} onClick={() => history.push(`/appointments/view/${appointment.uuid}`)} style={{ fontSize: '2em' }} />
      ]}
    >
      {/* <pre>{JSON.stringify(appointment, null, 2)}</pre> */}

      <div style={{ minHeight: '10rem' }}>
        {
          appointment.description && appointment.description !== '' &&
            <>
              <pre>{appointment.description}</pre>
              <hr />
            </>
        }

        <Link to={`/customers/view/${appointment.customer}`}><strong>{appointment.customerData.profile.name.display}</strong></Link>
        <p>{appointment.spacetime.location}</p>
        <p><em>A {appointment.spacetime.route.distanceMiles} mile trip</em></p>
      </div>
    </Card>
  )
}

export default AppointmentCard
