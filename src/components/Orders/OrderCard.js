/* global fetch */
/* eslint-disable react/prop-types */

import React, { useContext, useEffect, useState } from 'react'
import { Link, useHistory } from 'react-router-dom'
import { Button, Modal, Card, DatePicker, PageHeader, Statistic, Collapse, Row, Col, Tag, Typography, Rate, Input, InputNumber, Select, Switch, Timeline, message } from 'antd'
import Lightbox from 'react-image-lightbox'
import ReactMde from 'react-mde'
import MarkdownIt from 'markdown-it'
import HTMLParser from 'html-react-parser'
import Timer from 'react-compound-timer'
import moment from 'moment'

import {
  DashboardOutlined, QrcodeOutlined, BugOutlined, CheckOutlined, PhoneOutlined, FieldTimeOutlined, AppstoreAddOutlined, DeleteOutlined, LoadingOutlined,
  ExclamationCircleOutlined, PrinterOutlined, DesktopOutlined, ClockCircleOutlined, PictureOutlined, AuditOutlined, ApiOutlined, FormOutlined, MailOutlined
} from '@ant-design/icons'

import 'react-image-lightbox/style.css'

import { generateQRCode, showQRCode } from '../QRCode/QRCode'
import client from '../../feathers/client'
import { store } from '../../store'

const markdown = new MarkdownIt()

const { Panel } = Collapse
const { Text } = Typography
const { TextArea } = Input
const { RangePicker } = DatePicker

const OrderCard = props => {
  const history = useHistory()
  const Store = useContext(store)
  const { state } = Store

  // const pdfRef = React.createRef()

  const [order, setOrder] = useState(props.order)
  const [orderNotes, setOrderNotes] = useState(props.order.notes || '')
  const [orderQRCode, setOrderQRCode] = useState()
  const [newStatus, setNewStatus] = useState()
  const [intakePhotos, setIntakePhotos] = useState([])
  const [showLightbox, setShowLightbox] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [lightboxData, setLightboxData] = useState({ title: '', caption: '' })
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerData, setTimerData] = useState()
  const [timerStartTime, setTimerStartTime] = useState(0)
  const [timerEndTime, setTimerEndTime] = useState(0)
  const [timerDifference, setTimerDifference] = useState(0)
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [showChangeStatusDialog, setShowChangeStatusDialog] = useState(false)
  const [newEventMessage, setNewEventMessage] = useState('')
  const [newEventTime, setNewEventTime] = useState([moment(), moment()])
  const [selectedEventEditorTab, setSelectedEventEditorTab] = useState('write')
  const [selectedNotesEditorTab, setSelectedNotesEditorTab] = useState('preview')
  const [newPartData, setNewPartData] = useState({})
  const [showPartDialog, setShowPartDialog] = useState(false)
  const [printLoading, setPrintLoading] = useState(false)

  const [innerWidth, setInnerWidth] = useState(window.innerWidth)
  window.addEventListener('resize', () => setInnerWidth(window.innerWidth))

  useEffect(() => {
    setOrder(props.order)
  }, [props.order])

  useEffect(() => {
    setOrderQRCode(generateQRCode({ value: `O:${order.uuid}`, size: 128 }))
  }, [order.uuid])

  useEffect(() => {
    setNewEventTime([moment(timerStartTime), moment(timerEndTime)])
    if (timerEndTime !== 0) setTimerDifference(timerEndTime - timerStartTime)
  }, [timerStartTime, timerEndTime])

  useEffect(() => {
    if (timerDifference <= 0) return
    const duration = moment.duration(timerDifference)

    const data = {
      duration: timerDifference,
      days: duration.days(),
      hours: duration.hours(),
      minutes: duration.minutes(),
      seconds: duration.seconds()
    }

    console.log({ timerData: data })
    setTimerData(data)
    setNewEventTime([moment(timerStartTime), moment(timerEndTime)])
    setShowEventDialog(true)
  }, [timerDifference, timerStartTime, timerEndTime])

  const toggleTimer = () => {
    if (!timerRunning) setTimerStartTime(Date.now())
    if (timerRunning) setTimerEndTime(Date.now())
    setTimerRunning(!timerRunning)
  }

  useEffect(() => {
    const go = async () => {
      order.intakePhotos.forEach(async ({ value }) => {
        client.service('storage').timeout = 60000
        const result = await client.service('storage').get(value)
        setIntakePhotos(ip => [...ip, result])
      })
    }

    if (order && (order.intakePhotos && order.intakePhotos.length > 0) && (intakePhotos.length === 0)) go()
  }, [order, intakePhotos])

  useEffect(() => {
    const go = async () => {
      const machine = order.machinesData.filter(m => m.uuid === intakePhotos[lightboxIndex].related.machine)[0]
      // console.log({ machine, lightboxIndex, intakePhoto: intakePhotos[lightboxIndex] })
      setLightboxData({ title: `${machine.manufacturer} ${machine.model} (Serial: ${machine.serial})`, caption: `Taken on ${moment(intakePhotos[lightboxIndex].createdAt).format('dddd, MMMM Do YYYY hh:mm A')}` })
    }

    if (intakePhotos.length > 0) go()
  }, [lightboxIndex, intakePhotos, order])

  const openLightbox = async uuid => {
    let index = 0

    intakePhotos.forEach((photo, i) => {
      if (photo.uuid === uuid) index = i
    })

    setShowLightbox(true)
    setLightboxIndex(index)
  }

  const printOrderItem = async (item, returnDataUri = false) => {
    try {
      message.info(`Generating ${item} PDF..`, 2)
      setPrintLoading(true)
      client.service(`orders/print/${item}`).timeout = 60000
      const result = await client.service(`orders/print/${item}`).get(order.uuid)
      if (!result || !result.success) throw result

      const dataUri = `data:application/pdf;base64,${result.pdf}`
      const data = await fetch(dataUri)
      if (returnDataUri) return dataUri
      const blob = await data.blob()

      setPrintLoading(false)
      window.open(URL.createObjectURL(blob))
      // const blobWindow = window.open(URL.createObjectURL(blob))
      // if (typeof blobWindow.print === 'function') blobWindow.print()
    } catch (err) {
      setPrintLoading(false)
      console.error(err)
      message.error('An error occurred generating the document. Please try again.', 5)
    }
  }

  const emailReport = async () => {
    try {
      const pdf = await printOrderItem('report', true)

      // TODO: Email templates
      client.service('email-mailgun').timeout = 60000
      await client.service('email-mailgun').create({
        to: order.customerData.email,
        subject: `Here's your repair report! (${order.uuid.split('-')[0].toUpperCase()})`,
        attachment: {
          data: pdf,
          filename: `Order_Report_${order.uuid.split('-')[0].toUpperCase()}`,
          contentType: 'application/pdf'
        },
        html: `
          <h3>Thanks for letting us help you!</h3>
          <h5>Attached to this email, you'll find a detailed report of the service performed.</h5>
          <p>Any associated invoices will be sent in a separate email.</p>
        `
      })

      setPrintLoading(false)
      message.success('Report was emailed to customer')
    } catch (err) {
      console.error(err)
      setPrintLoading(false)
      message.error('Failed to send report email')
    }
  }

  const orderActionButtons = []

  orderActionButtons.push(
    <button
      key={Math.random().toString(36)}
      onClick={e => showQRCode({ uuid: order.uuid, type: 'O', title: `Order | ${order.uuid.split('-')[0].toUpperCase()}` })}
      className='order-action-link'
    >
      <QrcodeOutlined
        className='order-action-icon qrcode'
        title='View QR Code'
      />
      <strong>Show QR Code</strong>
    </button>
  )

  orderActionButtons.push(
    <button
      onClick={() => printOrderItem('worksheet')}
      className='order-action-link'
      disabled={printLoading}
      style={printLoading ? { opacity: 0.2 } : {}}
    >
      {
        !printLoading &&
          <PrinterOutlined
            className='order-action-icon print-worksheet'
            title='Print Worksheet'
          />
      }

      {
        printLoading &&
          <LoadingOutlined className='order-action-icon' />
      }
      <strong>Print Worksheet</strong>
    </button>
  )

  orderActionButtons.push(
    <button
      onClick={() => printOrderItem('timeline')}
      className='order-action-link'
      disabled={printLoading}
      style={printLoading ? { opacity: 0.2 } : {}}
    >
      {
        !printLoading &&
          <PrinterOutlined
            className='order-action-icon print-timeline'
            title='Print Timeline'
          />
      }

      {
        printLoading &&
          <LoadingOutlined className='order-action-icon' />
      }
      <strong>Print Timeline</strong>
    </button>
  )

  orderActionButtons.push(
    <button
      onClick={() => printOrderItem('report')}
      className='order-action-link'
      disabled={printLoading}
      style={printLoading ? { opacity: 0.2 } : {}}
    >
      {
        !printLoading &&
          <PrinterOutlined
            className='order-action-icon print-report'
            title='Print Report'
          />
      }

      {
        printLoading &&
          <LoadingOutlined className='order-action-icon' />
      }

      <strong>Print Report</strong>
    </button>
  )

  orderActionButtons.push(
    <button
      onClick={() => emailReport()}
      className='order-action-link'
      disabled={printLoading}
      style={printLoading ? { opacity: 0.2 } : {}}
    >
      {
        !printLoading &&
          <MailOutlined
            className='order-action-icon email-report'
            title='Email Report'
          />
      }

      {
        printLoading &&
          <LoadingOutlined className='order-action-icon' />
      }

      <strong>Email Report</strong>
    </button>
  )

  orderActionButtons.push(
    <button
      key={Math.random().toString(36)}
      onClick={toggleTimer}
      className='order-action-link'
    >
      {
        !timerRunning &&
          <FieldTimeOutlined
            className='order-action-icon timer'
            title='Start Timer'
          />
      }

      {
        timerRunning &&
          <Timer
            className='order-timer-countdown order-action-link'
            startImmediately={timerRunning}
          >
            {
              ({ start, resume, pause, stop, reset, timerState }) => (
                <>
                  <h1 style={{ marginBottom: '17px' }}>
                    <span style={{ fontSize: '1em' }}><Timer.Hours /></span>
                    <span className='text-muted transform-upper mr-2' style={{ fontSize: '0.5em' }}>h</span>
                    <span style={{ fontSize: '1em' }}><Timer.Minutes /></span>
                    <span className='text-muted transform-upper mr-2' style={{ fontSize: '0.5em' }}>m</span>
                    <span style={{ fontSize: '1em' }}><Timer.Seconds /></span>
                    <span className='text-muted transform-upper' style={{ fontSize: '0.5em' }}>s</span>
                  </h1>
                </>
              )
            }
          </Timer>
      }

      <strong>{`${timerRunning ? 'Stop' : 'Start'} Timer`}</strong>
    </button>
  )

  orderActionButtons.push(
    <button
      key={Math.random().toString(36)}
      onClick={() => setShowPartDialog(true)}
      className='order-action-link'
    >
      <AppstoreAddOutlined
        className='order-action-icon add-part'
        title='Add Part'
      />
      <strong>Add Part</strong>
    </button>
  )

  orderActionButtons.push(
    <button
      key={Math.random().toString(36)}
      onClick={() => { setNewEventTime([moment(), moment()]); setShowEventDialog(true) }}
      className='order-action-link'
    >
      <ExclamationCircleOutlined
        className='order-action-icon add-event'
        title='Add Event'
      />
      <strong>Add Event</strong>
    </button>
  )

  orderActionButtons.push(
    <button
      key={Math.random().toString(36)}
      onClick={() => setShowChangeStatusDialog(true)}
      className='order-action-link'
    >
      <CheckOutlined
        className='order-action-icon change-order-status'
        title='Change Status'
      />
      <strong>Change Status</strong>
    </button>
  )

  const saveNewEvent = async () => {
    const data = {
      user: state.user.uuid,
      type: 'note',
      title: 'Manual Event',
      timerData,
      message: newEventMessage
    }

    if (newEventTime) {
      data.start = newEventTime[0].toISOString()
      data.end = newEventTime[1].toISOString()
    }

    try {
      const result = await client.service('orders').patch(order.uuid, { events: [...order.events, data] })
      console.log({ result })
      setOrder(result)
      setNewEventMessage('')
      setShowEventDialog(false)
      setTimerData(null)
      message.success('The event was added successfully!')
    } catch (err) {
      console.error(err)
      message.error('Failed to add the event to the order. Please try again.', 10)
    }
  }

  const saveNewPart = async () => {
    const data = { ...newPartData, price: newPartData.price * 100, machine: newPartData.machine || order.machines[0] }

    try {
      const result = await client.service('orders').patch(order.uuid, { parts: [...order.parts, data] })
      console.log({ result })
      setOrder(result)
      setNewPartData({})
      setShowPartDialog(false)
      message.success('The part was added successfully!')
    } catch (err) {
      console.error(err)
      message.error('Failed to add the part to the order. Please try again.', 10)
    }
  }

  const deletePart = async uuid => {
    const partIndex = order.parts.findIndex(p => p.uuid === uuid)
    const parts = [...order.parts]
    parts.splice(partIndex, 1)
    const result = await client.service('orders').patch(order.uuid, { parts })
    console.log({ result })
    setOrder(result)
  }

  // const approvePart = async (uuid) => {
  //   const partIndex = order.parts.findIndex(p => p.uuid === uuid)
  //   const parts = [...order.parts]
  //   parts[partIndex].approved = true
  //   const result = await client.service('orders').patch(order.uuid, { parts })
  //   console.log({ result })
  //   setOrder(result)
  // }

  const updateOrderNotes = async value => {
    setOrderNotes(value)

    try {
      await client.service('orders').patch(order.uuid, { notes: value })
    } catch (err) {
      console.error(err)
      message.error('Error updating notes. Please reload and try again.', 5)
    }
  }

  const changeStatus = async () => {
    try {
      const result = await client.service('orders').patch(order.uuid, { status: newStatus })
      setOrder(result)
    } catch (err) {
      console.error(err)
      message.error('Error updating status. Please reload and try again.', 5)
    }
  }

  return (
    <>
      <Modal
        title={<h4>Change Order Status</h4>}
        visible={showChangeStatusDialog}
        onCancel={() => {
          setNewStatus(order.status)
          setShowChangeStatusDialog(false)
        }}
        onOk={() => {
          changeStatus()
          setShowChangeStatusDialog(false)
        }}
      >
        <Select
          placeholder='Select new status'
          defaultValue={order.status}
          value={newStatus}
          style={{ width: '100%' }}
          onChange={setNewStatus}
        >
          <Select.Option value='pending'>Pending</Select.Option>
          <Select.Option value='complete'>Complete</Select.Option>
          <Select.Option value='delivered'>Delivered</Select.Option>
        </Select>
      </Modal>

      <Modal
        title={<h4>Add New Event</h4>}
        visible={showEventDialog}
        onCancel={() => { setTimerData(null); setShowEventDialog(false) }}
        onOk={saveNewEvent}
      >
        {
          timerData &&
            <>
              <p>
                <span style={{ marginRight: '1em' }}>Duration:</span>
                <Tag color='blue'>
                  {timerData.days > 0 && <span style={{ marginRight: '1em' }}>{timerData.days}d</span>}
                  {timerData.hours > 0 && <span style={{ marginRight: '1em' }}>{timerData.hours}h</span>}
                  {timerData.minutes > 0 && <span style={{ marginRight: '1em' }}>{timerData.minutes}m</span>}
                  {timerData.seconds > 0 && <span>{timerData.seconds}s</span>}
                </Tag>
              </p>
              <hr />
            </>
        }

        <h6>Event Date and Time</h6>
        <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
          <Col className='gutter-row' xs={24} xl={24} style={{ marginBottom: '2em' }}>
            <RangePicker
              allowClear
              autoFocus
              style={{ width: '100%' }}
              showTime={{ format: 'HH:mm:ss' }}
              format='YYYY-MM-DD HH:mm:ss'
              minuteStep={1}
              onChange={range => {
                setTimerStartTime(range[0].valueOf())
                setTimerEndTime(range[1].valueOf())
                setTimerDifference(range[1].valueOf() - range[0].valueOf())
              }}
              value={newEventTime}
              defaultValue={newEventTime}
            />
          </Col>
        </Row>

        <h6>Event Description</h6>
        <ReactMde
          value={newEventMessage}
          onChange={setNewEventMessage}
          selectedTab={selectedEventEditorTab}
          onTabChange={setSelectedEventEditorTab}
          generateMarkdownPreview={md => Promise.resolve(markdown.render(md))}
        />
      </Modal>

      <Modal
        title={<h4>Add Part</h4>}
        visible={showPartDialog}
        onCancel={() => { setNewPartData({}); setShowPartDialog(false) }}
        onOk={saveNewPart}
      >
        <Input
          autoFocus
          placeholder='Part Name'
          value={newPartData.name}
          style={{ marginBottom: '1em' }}
          onChange={e => {
            e.persist()
            setNewPartData(data => {
              return { ...data, name: e.target.value }
            })
          }}
        />

        <Input
          placeholder='Part Category'
          value={newPartData.category}
          style={{ marginBottom: '1em' }}
          onChange={e => {
            e.persist()
            setNewPartData(data => {
              return { ...data, category: e.target.value }
            })
          }}
        />

        <TextArea
          placeholder='Part Description'
          value={newPartData.description}
          style={{ marginBottom: '1em' }}
          onChange={e => {
            e.persist()
            setNewPartData(data => {
              return { ...data, description: e.target.value }
            })
          }}
        />

        <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }} style={{ marginTop: '1em' }}>
          <Col className='panel-col-equalize-height mb-2 gutter-row' xs={24} xl={6}>
            <strong>Machine:</strong>
          </Col>

          <Col className='panel-col-equalize-height mb-2 gutter-row' xs={24} xl={18}>
            <Select
              defaultValue={order.machinesData[0].uuid}
              style={{ width: '100%' }}
              onChange={value => {
                setNewPartData(data => {
                  return { ...data, machine: value }
                })
              }}
            >
              {
                order.machinesData.map(machine => {
                  return (
                    <Select.Option key={machine.uuid} value={machine.uuid}>{machine.manufacturer} {machine.model} (Serial: {machine.serial})</Select.Option>
                  )
                })
              }
            </Select>
          </Col>
        </Row>

        <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }} style={{ marginTop: '1em' }}>
          <Col className='panel-col-equalize-height mb-2 gutter-row' xs={24} xl={12}>
            <strong>Quantity:</strong>
          </Col>

          <Col className='panel-col-equalize-height mb-2 gutter-row' xs={24} xl={12}>
            <InputNumber
              style={{ width: '100%' }}
              placeholder='Quantity'
              value={newPartData.quantity || 1}
              onChange={value => setNewPartData(data => {
                return { ...data, quantity: value }
              })}
            />
          </Col>
        </Row>

        <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }} style={{ marginTop: '1em' }}>
          <Col className='panel-col-equalize-height mb-2 gutter-row' xs={24} xl={12}>
            <strong>Unit Price:</strong>
          </Col>

          <Col className='panel-col-equalize-height mb-2 gutter-row' xs={24} xl={12}>
            <InputNumber
              style={{ width: '100%' }}
              placeholder='Unit Price'
              value={newPartData.price || ''}
              onChange={value => setNewPartData(data => {
                return { ...data, price: value }
              })}
            />
          </Col>
        </Row>

        <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }} style={{ marginTop: '1em' }}>
          <Col className='panel-col-equalize-height mb-2 gutter-row' xs={24} xl={12}>
            <strong>Approved by Customer?</strong>
          </Col>

          <Col className='panel-col-equalize-height mb-2 gutter-row text-right' xs={24} xl={12}>
            <Switch
              checked={newPartData.approved}
              onChange={value => setNewPartData(data => {
                data.approved = value
                return data
              })}
            />
          </Col>
        </Row>
      </Modal>

      <Card
        className='order-card'
        style={{ borderRadius: '10px', borderColor: '#999' }}
        title={
          <div>
            <PageHeader
              title={
                <span>
                  <Text>Order <Text copyable={{ text: order.uuid }}>{order.uuid.split('-')[0].toUpperCase()}</Text></Text>
                  <br />
                  <Link to={`/customers/view/${order.customerData.uuid}`}><em>{order.customerData.profile.name.display}</em></Link>
                </span>
              }
              onBack={() => history.goBack()}
              style={{ marginBottom: '2em' }}
            />
          </div>
        }
        extra={innerWidth && innerWidth > 800 && orderQRCode}
      >
        <Card className='order-action-card'>
          {
            orderActionButtons && orderActionButtons.length > 0 &&
              <Row>
                {
                  orderActionButtons.map(action => {
                    return (
                      <Col key={Math.random().toString(36)} xl={8} lg={8} md={10} sm={12} xs={12} className='order-action-card-col'>
                        <Card.Grid
                          className='order-action-card-grid'
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

        <Collapse defaultActiveKey={['overview', 'notes', 'problem', 'machines', 'parts', 'timeline']}>
          <Panel
            key='overview'
            header={
              <div className='order-view-panel-header'>
                <h4>
                  <DashboardOutlined />
                  Overview
                </h4>
              </div>
            }
          >
            <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
              <Col className='panel-col-equalize-height mb-2 gutter-row' xs={24} xl={12}>
                <Card title={<h5>Customer</h5>} className='h-100'>
                  <Link to={`/customers/view/${order.customerData.uuid}`}><h3>{order.customerData.profile.name.display}</h3></Link>
                  {order.customerData.profile.company.isCompany && <h5><em className='text-muted'>{order.customerData.profile.company.name}</em></h5>}
                  {
                    order.customerData.profile.phone.primary.number !== '' &&
                      <h5>
                        <PhoneOutlined style={{ position: 'relative', top: '-3px', marginRight: '1em' }} />
                        <a href={`tel:${order.customerData.profile.phone.primary.number}`}>{order.customerData.profile.phone.primary.number}</a>
                      </h5>
                  }
                </Card>
              </Col>

              <Col className='panel-col-equalize-height mb-2 gutter-row' xs={24} xl={12}>
                <Card
                  title={<h5>Status</h5>}
                  className='h-100'
                  extra={
                    <Tag color={order.status !== 'pending' ? 'green' : 'magenta'}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Tag>
                  }
                >
                  <Statistic className='order-statistic' title='Order Created' prefix={<ClockCircleOutlined />} value={moment(order.createdAt).format('dddd, MMMM Do YYYY hh:mm A')} />
                  <Statistic className='order-statistic' title='Order Updated' prefix={<ClockCircleOutlined />} value={moment(order.updatedAt).format('dddd, MMMM Do YYYY hh:mm A')} />
                </Card>
              </Col>
            </Row>
          </Panel>

          <Panel
            key='notes'
            header={
              <div className='order-view-panel-header'>
                <h4>
                  <FormOutlined />
                  <span>Notes</span>
                </h4>
              </div>
            }
          >
            <ReactMde
              value={orderNotes}
              onChange={updateOrderNotes}
              selectedTab={selectedNotesEditorTab}
              onTabChange={setSelectedNotesEditorTab}
              generateMarkdownPreview={md => Promise.resolve(markdown.render(md))}
            />
          </Panel>

          <Panel
            key='problem'
            header={
              <div className='order-view-panel-header'>
                <h4>
                  <AuditOutlined />
                  <span>Problem Description</span>
                </h4>
              </div>
            }
          >
            {/* <Editor
              readOnly
              defaultValue={order.description}
            /> */}

            {HTMLParser(markdown.render(order.description))}
          </Panel>

          <Panel
            key='accessories'
            header={
              <div className='order-view-panel-header'>
                <h4>
                  <ApiOutlined />
                  <span>Accessories</span>
                </h4>
              </div>
            }
          >
            {
              order.accessories && order.accessories.length > 0 &&
                <>
                  <Card>
                    {
                      order.accessories.map(acc => {
                        return (
                          <Card.Grid key={acc} style={{ width: '25%', textAlign: 'center' }}>
                            <strong>{acc}</strong>
                          </Card.Grid>
                        )
                      })
                    }
                  </Card>
                </>
            }
          </Panel>

          <Panel
            key='machines'
            header={
              <div className='order-view-panel-header'>
                <h4>
                  <DesktopOutlined />
                  <span>{order && order.machinesData && order.machinesData.length === 1 ? 'Machine' : 'Machines'}</span>
                </h4>
              </div>
            }
          >
            {
              order.machinesData && order.machinesData.length > 0 &&
                <>
                  <Card>
                    {
                      order.machinesData.map(machine => {
                        const password = order.intakePasswords.find(p => p.machine === machine.uuid)
                        const condition = order.intakeConditions.find(c => c.machine === machine.uuid)
                        const description = order.intakeDescriptions.find(d => d.machine === machine.uuid)

                        let gridWidth = '100%'
                        switch (order.machinesData.length) {
                          case 1:
                            gridWidth = '100%'
                            break
                          case 2:
                            gridWidth = '50%'
                            break
                          case 3:
                            gridWidth = '33%'
                            break
                          default:
                            gridWidth = '25%'
                        }

                        return (
                          <Card.Grid
                            key={Math.random().toString(36)}
                            style={{ width: gridWidth, textAlign: 'center', cursor: 'pointer' }}
                          >
                            <strong>{machine.manufacturer} {machine.model}</strong>
                            <br />
                            <strong>Serial: <span className='mono'>{machine.serial}</span></strong>
                            <br />

                            <Rate
                              disabled
                              tooltips={['Destroyed', 'Damaged', 'Fair', 'Good', 'Perfect']}
                              defaultValue={condition && condition.value}
                              style={{ fontSize: '1em', marginLeft: '1em' }}
                            />

                            <p style={{ fontSize: '1.5em' }}><strong>{description && description.value}</strong></p>
                            <Input.Password readOnly value={password && password.value} />
                          </Card.Grid>
                        )
                      })
                    }
                  </Card>
                </>
            }
          </Panel>

          <Panel
            key='intake-photos'
            header={
              <div className='order-view-panel-header'>
                <h4>
                  <PictureOutlined />
                  <span>Intake Photos</span>
                </h4>
              </div>
            }
          >
            {
              intakePhotos && intakePhotos.length > 0 &&
                <>
                  <Card>
                    {
                      intakePhotos.map(photo => {
                        return (
                          <Card.Grid
                            key={Math.random().toString(36)}
                            style={{ width: '25%', textAlign: 'center' }}
                            onClick={() => openLightbox(photo.uuid)}
                          >
                            <img alt='Intake condition' src={photo.datauri || (photo.data && photo.data.uri)} style={{ width: '100%', position: 'relative', zIndex: 100000 }} />
                          </Card.Grid>
                        )
                      })
                    }
                  </Card>
                </>
            }

            {
              showLightbox &&
                <Lightbox
                  imageTitle={lightboxData.title}
                  imageCaption={lightboxData.caption}
                  reactModalStyle={{ zIndex: 200000 }}
                  mainSrc={intakePhotos[lightboxIndex].data.uri}
                  nextSrc={intakePhotos[(lightboxIndex + 1) % intakePhotos.length].data.uri}
                  prevSrc={intakePhotos[(lightboxIndex + intakePhotos.length - 1) % intakePhotos.length].data.uri}
                  onCloseRequest={() => setShowLightbox(false)}
                  onMoveNextRequest={() => setLightboxIndex(i => (i + 1) % intakePhotos.length)}
                  onMovePrevRequest={() => setLightboxIndex(i => (i + intakePhotos.length - 1) % intakePhotos.length)}
                />
            }
          </Panel>

          <Panel
            key='parts'
            header={
              <div className='order-view-panel-header'>
                <h4>
                  <AppstoreAddOutlined />
                  <span>Parts</span>
                </h4>
              </div>
            }
          >
            {
              order.parts && order.parts.length > 0 &&
                <>
                  <Card>
                    {
                      order.parts.map(part => {
                        const machine = order.machinesData.find(m => m.uuid === part.machine)

                        return (
                          <Card.Grid key={part.uuid} className='ant-row-flex order-parts-card-grid'>
                            <h5 title={part.uuid}>{part.name}</h5>
                            <p className={`ant-tag ${part.approved ? 'ant-tag-green' : 'ant-tag-magenta'}`}>{part.approved ? <>Approved</> : <>Not Approved</>}</p>
                            <p>Category: {part.category}</p>
                            {
                              machine &&
                                <>
                                  <p>
                                    <strong>Machine:</strong>
                                    <br />
                                    {machine.manufacturer} {machine.model}
                                    <br />
                                    (Serial: {machine.serial})
                                  </p>
                                  <pre>{part.description && part.description !== '' ? part.description : ' '}</pre>
                                  <strong>Price: ${Number(part.price / 100)}</strong>
                                  <br />
                                  <strong>Quantity: {Number(part.quantity)}</strong>
                                </>
                            }

                            <hr />

                            <Button
                              title='Delete this Part'
                              type='danger'
                              shape='circle'
                              icon={<DeleteOutlined style={{ position: 'relative', top: '-5px' }} />}
                              onClick={() => deletePart(part.uuid)}
                              style={{ margin: '0.25em' }}
                            />

                            {
                              // !part.approved &&
                              //   <Button
                              //     title='Approve this Part'
                              //     type='primary'
                              //     shape='circle'
                              //     icon={<CheckOutlined style={{ position: 'relative', top: '-5px' }} />}
                              //     onClick={() => approvePart(part.uuid)}
                              //     style={{ margin: '0.25em' }}
                              //   />
                            }
                          </Card.Grid>
                        )
                      })
                    }
                  </Card>
                </>
            }
          </Panel>

          <Panel
            key='timeline'
            header={
              <div className='order-view-panel-header'>
                <h4>
                  <FieldTimeOutlined />
                  <span>Timeline</span>
                </h4>
              </div>
            }
          >
            <Timeline mode='alternate'>
              <Timeline.Item color='green'>
                <Tag>{moment(order.createdAt).format('dddd, MMMM Do YYYY hh:mm A')}</Tag>
                <h4>This order was created</h4>
              </Timeline.Item>

              {
                order.events.sort((a, b) => moment(a.start).valueOf() - moment(b.start).valueOf()).map(event => {
                  return (
                    <Timeline.Item
                      key={event.uuid}
                      dot={event.end && !moment(event.end).isSame(moment(event.start)) && <ClockCircleOutlined style={{ fontSize: '14px' }} />}
                    >
                      {/* <Tag>{moment(event.start || event.createdAt).format('dddd, MMMM Do YYYY hh:mm A')}</Tag> */}
                      <Tag title={moment(event.start || event.createdAt).format('dddd, MMMM Do YYYY hh:mm A')}>{moment(event.start || event.createdAt).fromNow()}</Tag>
                      {/* {event.end && !moment(event.end).isSame(moment(event.start)) && <Tag color='red'>Until {moment(event.end).format('dddd, MMMM Do YYYY hh:mm A')}</Tag>} */}
                      {/* {event.end && !moment(event.end).isSame(moment(event.start)) && <Tag color='red' title={moment(event.end).format('dddd, MMMM Do YYYY hh:mm A')}>Until {moment(event.end).fromNow()}</Tag>} */}
                      {event.timerData && <Tag color='blue' title={`${moment(event.start).format('dddd, MMMM Do YYYY hh:mm:ss A')} - ${moment(event.end).format('dddd, MMMM Do YYYY hh:mm:ss A')}`}>Duration: {event.timerData.hours}h {event.timerData.minutes}m {event.timerData.seconds}s</Tag>}
                      {HTMLParser(markdown.render(event.message))}
                    </Timeline.Item>
                  )
                })
              }
            </Timeline>
          </Panel>

          <Panel
            key='raw'
            header={
              <div className='order-view-panel-header'>
                <h4>
                  <BugOutlined />
                  <span>Raw Data</span>
                </h4>
              </div>
            }
          >
            <pre>{JSON.stringify(order, null, 2)}</pre>
          </Panel>
        </Collapse>
      </Card>
    </>
  )
}

export default OrderCard
