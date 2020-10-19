import React, { useState, useEffect } from 'react'
import { Layout, AutoComplete, Breadcrumb, PageHeader, Form, Input, Button, DatePicker, Card, Row, Col, message } from 'antd'
import { Link, useHistory } from 'react-router-dom'
import PlacesAutocomplete from 'react-places-autocomplete'
import moment from 'moment'

import TopNav from '../TopNav/TopNav'
import Loader from '../Loader/Loader'
import client from '../../feathers/client'

const { RangePicker } = DatePicker

const NewAppointment = () => {
  const history = useHistory()

  const [isCreating, setIsCreating] = useState(false)
  const [appointmentTitle, setAppointmentTitle] = useState('')
  const [appointmentOrigin, setAppointmentOrigin] = useState('')
  const [appointmentLocation, setAppointmentLocation] = useState('')
  const [appointmentLocationData, setAppointmentLocationData] = useState(null)
  const [appointmentTime, setAppointmentTime] = useState('')
  // const [appointmentRange, setAppointmentRange] = useState([])
  const [customerID, setCustomerID] = useState(null)
  const [customers, setCustomers] = useState([])
  const [customerData, setCustomerData] = useState(false)
  const [customerProvided, setCustomerProvided] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [federalMileageRate, setFederalMileageRate] = useState(null)

  // A little workaround for react-places-autocomplete to handle async loading of maps js api
  const [windowGoogle, setWindowGoogle] = useState(null)
  const googleApiWatcher = setInterval(() => {
    if (window.google) {
      setWindowGoogle(window.google)
      clearInterval(googleApiWatcher)
    }
  }, 500)

  const onFinish = async values => {
    values.customerID = customerID
    if (!appointmentTime) return message.error('Invalid datetime')

    const start = appointmentTime[0].toLocaleString()
    const end = appointmentTime[1].toLocaleString()
    const location = appointmentLocation

    try {
      const appointment = {
        customer: customerID || values.customer,
        title: appointmentTitle,
        spacetime: { start, end, location, route: { ...appointmentLocationData } },
        description: values.description
      }

      console.log({ appointment })

      setIsCreating(true)
      const result = await client.service('appointments').create(appointment)
      history.replace(`/appointments/view/${result.uuid}`)
    } catch (err) {
      console.error(err)
      message.error('Error creating appointment', 10)
      setIsCreating(false)
    }
  }

  const onFail = err => {
    console.error(err)
  }

  const onSearchCustomer = async search => {
    setCustomerSearch(search)
    setAppointmentTitle(search)
    if (!search || search === '') return setAppointmentTitle('')
    if (search.length < 3) return setCustomers([])

    const result = await client.service('customers').find({ query: { $limit: -1, $search: search } })
    setCustomers(result)
  }

  const onSelectCustomer = async customer => {
    const result = await client.service('customers').get(customer)
    setCustomerID(result.uuid)
    setAppointmentTitle(result.profile.name.display)
    setCustomerSearch(result.profile.name.display)
    setAppointmentLocation(result.profile.address.physical || result.profile.address.billing || '')
    document.querySelector('textarea').focus()
  }

  const disabledDate = current => {
    // TODO: Make this configurable
    return ![1, 2, 3, 4, 5].includes(current.weekday())
  }

  useEffect(() => {
    const go = async () => {
      if (!appointmentLocation || appointmentLocation === '') return false

      if (!appointmentOrigin) {
        try {
          const result = await client.service('settings').get('appointments.origin')
          console.log(result)
          setAppointmentOrigin(result.text)
        } catch (err) {
          console.error(err)
          setAppointmentOrigin('220 N. Main St, Nashville, AR 71852')
        }
      }

      if (window.google && appointmentOrigin) {
        const DirectionsService = new window.google.maps.DirectionsService()

        DirectionsService.route({
          origin: appointmentOrigin,
          destination: appointmentLocation,
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
        })
      }
    }

    go()
  }, [appointmentLocation, appointmentOrigin])

  useEffect(() => {
    const go = async () => {
      const cid = new URLSearchParams(window.location.search).get('customer')
      if (!cid) return
      const result = await client.service('customers').get(cid)
      setCustomerID(cid)
      setCustomerData(result)
      setCustomerProvided(true)
      setAppointmentTitle(result.profile.name.display)
      setAppointmentLocation(result.profile.address.physical || result.profile.address.billing || '')
    }

    go()
  }, [])

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
    return () => { window.google = null; setWindowGoogle(null) }
  }, [])

  useEffect(() => {
    console.log({ appointmentTime })
    // if (appointmentTime !== '') setAppointmentRange([appointmentTime])
    // if (appointmentTime) document.querySelector('input[placeholder="End date"]').value = appointmentTime[1].format('YYYY-MM-DD HH:mm')
  }, [appointmentTime])

  const onCalendarChange = ([start, end]) => {
    console.log('onCalendarChange', { start, end })
    if (!end && moment.isMoment(start)) {
      // This is icky, but effective. Default to hour blocks.
      // TODO: Make configurable
      try {
        setTimeout(() => {
          document.querySelector('input[name=title]').focus()
          setTimeout(() => {
            setAppointmentTime([start.clone(), start.clone().add(1, 'hour')])
            document.querySelector('input#new-appointment_timeCoordinates').value = start.clone().format('YYYY-MM-DD HH:mm')
            document.querySelector('div.ant-picker-input-active input').value = start.clone().add(1, 'hour').format('YYYY-MM-DD HH:mm')
          }, 200)
        }, 500)
      } catch (err) {
        console.error(err)
      }
    }
  }

  return (
    <Layout>
      <TopNav />
      <Layout>
        <Layout style={{ padding: '0 24px 24px', minHeight: '100vh' }}>
          <Breadcrumb style={{ margin: '16px 0' }}>
            <Breadcrumb.Item>{process.env.REACT_APP_SERVICESHOP_NAME || 'Home'}</Breadcrumb.Item>
            <Breadcrumb.Item><Link to='/appointments'>Appointments</Link></Breadcrumb.Item>
            <Breadcrumb.Item>New Appointment</Breadcrumb.Item>
          </Breadcrumb>

          <PageHeader
            title='New Appointment'
            onBack={() => history.goBack()}
          />

          {isCreating && <Loader text='Creating the appointment, just a sec!' />}

          {
            !isCreating &&
              <Form
                name='new-appointment'
                layout='horizontal'
                onFinish={onFinish}
                onFinishFailed={onFail}
              >
                <Card
                  title={
                    <div>
                      <strong>Basic Details</strong>
                    </div>
                  }
                  style={{ borderRadius: '3px', borderColor: '#999' }}
                >
                  <h6>Appointment Date and Time</h6>
                  <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col className='gutter-row' xs={24} xl={24} style={{ marginBottom: '2em' }}>
                      <Form.Item name='timeCoordinates' value={appointmentTime}>
                        <RangePicker
                          allowClear
                          autoFocus
                          style={{ width: '100%' }}
                          showTime={{ format: 'HH:mm' }}
                          format='YYYY-MM-DD HH:mm'
                          minuteStep={15}
                          hideDisabledOptions
                          disabledHours={() => [0, 1, 2, 3, 4, 5, 6, 7, 8, 18, 19, 20, 21, 22, 23, 24]} // TODO: make this configurable
                          onChange={setAppointmentTime}
                          disabledDate={disabledDate}
                          onCalendarChange={onCalendarChange}
                          value={appointmentTime}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <h6>Customer</h6>
                  <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col className='gutter-row' xs={24} xl={24} style={{ marginBottom: '2em' }}>
                      {
                        !customerProvided &&
                          <AutoComplete
                            autoFocus
                            defaultActiveFirstOption
                            className='ant-input customer-search'
                            placeholder='Search customers..'
                            value={customerSearch}
                            onChange={onSearchCustomer}
                            onSelect={value => { onSelectCustomer(value) }}
                            options={customers.map(c => ({ value: c.uuid, label: `${c.profile.name.display}${c.profile.company.isCompany ? ' » ' + c.profile.company.name : ''}` }))}
                          />
                      }

                      {customerProvided && <h5>{customerData.profile.name.display}</h5>}
                    </Col>
                  </Row>

                  <h6>Appointment Title</h6>
                  <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col className='gutter-row' xs={24} xl={24} style={{ marginBottom: '2em' }}>
                      <input name='title' placeholder='Appointment Title' type='text' className='ant-input' value={appointmentTitle} onChange={e => setAppointmentTitle(e.target.value)} />
                    </Col>
                  </Row>

                  <h6>Appointment Description</h6>
                  <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col className='gutter-row' xs={24} xl={24} style={{ marginBottom: '2em' }}>
                      <Form.Item name='description'>
                        <Input.TextArea placeholder='Appointment Description' />
                      </Form.Item>
                    </Col>
                  </Row>

                  <h6>Appointment Location</h6>
                  <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col className='gutter-row' xs={24} xl={24} style={{ marginBottom: '2em' }}>
                      {!windowGoogle && <Input onChange={e => setAppointmentLocation(e.target.value)} />}
                      {
                        windowGoogle &&
                          <PlacesAutocomplete
                            value={appointmentLocation}
                            onChange={setAppointmentLocation}
                            onSelect={setAppointmentLocation}
                            searchOptions={{
                              types: ['address']
                            }}
                          >
                            {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
                              <div>
                                <input
                                  {...getInputProps({
                                    name: 'location',
                                    placeholder: 'Search addresses..',
                                    className: 'ant-input'
                                  })}
                                />
                                <div className='autocomplete-dropdown-container'>
                                  {loading && <div>Loading...</div>}
                                  {suggestions.map(suggestion => {
                                    const className = suggestion.active
                                      ? 'suggestion-item--active'
                                      : 'suggestion-item'
                                    // inline style for demonstration purpose
                                    const style = suggestion.active
                                      ? { backgroundColor: '#fafafa', cursor: 'pointer' }
                                      : { backgroundColor: '#ffffff', cursor: 'pointer' }
                                    return (
                                      <div
                                        key={Math.random().toString(36)}
                                        {...getSuggestionItemProps(suggestion, {
                                          className,
                                          style
                                        })}
                                      >
                                        <span>{suggestion.description}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </PlacesAutocomplete>
                      }

                      {
                        appointmentLocationData && (
                          <div style={{ marginTop: '2em' }}>
                            {/* <pre>{JSON.stringify(appointmentLocationData, null, 2)}</pre> */}
                            <h3>
                              Via {appointmentLocationData.via}, this trip is {Math.ceil(appointmentLocationData.distanceMiles)}
                              {Math.ceil(appointmentLocationData.distanceMiles) === 1 ? ' mile ' : ' miles '}
                              and will take {moment.duration(appointmentLocationData.durationSeconds * 1000).humanize()}
                            </h3>

                            <h5>Cost at Federal Mileage Rate: ${(appointmentLocationData.distanceMiles * federalMileageRate).toFixed(2)}</h5>
                          </div>
                        )
                      }
                    </Col>
                  </Row>
                </Card>

                <hr />

                <Button type='primary' size='large' block htmlType='submit'>
                  Save Appointment
                </Button>
                <hr />
              </Form>
          }
        </Layout>
      </Layout>
    </Layout>
  )
}

export default NewAppointment
