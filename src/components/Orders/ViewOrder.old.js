import React, { useEffect, useState } from 'react'
import { Layout, Breadcrumb, Button, Input, Tag, Card, PageHeader, Rate, Space, Row, Col } from 'antd'
import { AppstoreAddOutlined, BarsOutlined, CheckOutlined, DeleteOutlined, FieldTimeOutlined, PhoneOutlined } from '@ant-design/icons'
import { Link, useHistory, useParams } from 'react-router-dom'
import Lightbox from 'react-image-lightbox'
import Editor from 'rich-markdown-editor'
import moment from 'moment'

import 'react-image-lightbox/style.css'

import Loader from '../Loader/Loader'
import TopNav from '../TopNav/TopNav'
import Sidebar from '../Sidebar/Sidebar'
import client from '../../feathers/client'

const ViewOrder = () => {
  const { uuid } = useParams()
  const history = useHistory()

  const [order, setOrder] = useState(null)
  const [intakePhotos, setIntakePhotos] = useState([])
  const [showLightbox, setShowLightbox] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [lightboxData, setLightboxData] = useState({ title: '', caption: '' })

  useEffect(() => {
    const go = async () => {
      const result = await client.service('orders').get(uuid)
      setOrder(result)
    }

    if (!order) go()
  }, [order, uuid])

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

  const sidebarIconStyle = { position: 'relative', top: '-3px' }
  const sidebarActions = [
    {
      icon: <BarsOutlined />,
      title: 'Common Tasks',

      items: [
        {
          icon: <CheckOutlined style={sidebarIconStyle} />,
          title: 'Finalize Order'
        }
      ]
    }
  ]

  return (
    <Layout>
      <TopNav />
      <Layout>
        {window.innerWidth > 800 && <Sidebar actions={sidebarActions} />}
        <Layout style={{ padding: '0 24px 24px', minHeight: '100vh' }}>
          {!order && <Loader text='Loading order, just a sec..' />}
          {
            order &&
              <div className='animate__animated animate__slideInRight animate__faster'>
                <Breadcrumb style={{ margin: '16px 0' }}>
                  <Breadcrumb.Item>{process.env.REACT_APP_SERVICESHOP_NAME || 'Home'}</Breadcrumb.Item>
                  <Breadcrumb.Item><Link to='/orders'>Orders</Link></Breadcrumb.Item>
                  <Breadcrumb.Item>
                    <Link to={`/customers/view/${order.customerData.uuid}`}>
                      {order.customerData.profile.name.display}
                    </Link>
                  </Breadcrumb.Item>
                  <Breadcrumb.Item>
                    <Link to={`/orders/view/${order.uuid}`}>
                      {order.uuid.split('-')[0].toUpperCase()}
                    </Link>
                  </Breadcrumb.Item>
                  {/* <Breadcrumb.Item>
                    <Tag color={order.status === 'complete' ? 'green' : 'red'}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Tag>

                    <Tag color='green'>
                      Created: {moment(order.createdAt).format('dddd, MMMM Do YYYY, h:mm a')}
                    </Tag>

                    <Tag color='blue'>
                      Updated: {moment(order.updatedAt).format('dddd, MMMM Do YYYY, h:mm a')}
                    </Tag>
                  </Breadcrumb.Item> */}
                </Breadcrumb>

                <PageHeader
                  title={
                    <>
                      <span>Order {order.uuid.split('-')[0].toUpperCase()}</span>
                      <br />
                      <Tag color={order.status === 'complete' ? 'green' : 'red'}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Tag>

                      <Tag color='green'>
                        Created: {moment(order.createdAt).format('dddd, MMMM Do YYYY, h:mm a')}
                      </Tag>

                      <Tag color='blue'>
                        Updated: {moment(order.updatedAt).format('dddd, MMMM Do YYYY, h:mm a')}
                      </Tag>
                    </>
                  }
                  onBack={() => history.goBack()}
                />

                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                  <Col className='gutter-row' xs={24} xl={24} style={{ marginBottom: '2em' }}>
                    <Card title='Actions'>
                      <Button type='primary' style={{ marginRight: '1em' }}>
                        <CheckOutlined style={{ position: 'relative', top: '-3px' }} />
                        Finalize Order
                      </Button>

                      <Button type='primary' danger style={{ marginRight: '1em' }}>
                        <DeleteOutlined style={{ position: 'relative', top: '-3px' }} />
                        Delete Order
                      </Button>

                      <Button type='default' style={{ marginRight: '1em' }}>
                        <FieldTimeOutlined style={{ position: 'relative', top: '-3px' }} />
                        Start Work Timer
                      </Button>

                      <Button type='dashed' style={{ marginRight: '1em' }}>
                        <AppstoreAddOutlined style={{ position: 'relative', top: '-3px' }} />
                        Add Part
                      </Button>
                    </Card>
                  </Col>
                </Row>

                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                  <Col className='gutter-row' xs={24} xl={24}>
                    <Card title='Customer'>
                      <h3>{order.customerData.profile.name.display}</h3>
                      {order.customerData.profile.company.isCompany && <h5><em className='text-muted'>{order.customerData.profile.company.name}</em></h5>}
                      {
                        order.customerData.profile.phone.primary.number !== '' &&
                          <h5>
                            <PhoneOutlined style={{ position: 'relative', top: '-3px', marginRight: '1em' }} />
                            <span>{order.customerData.profile.phone.primary.number}</span>
                          </h5>
                      }
                      <Button type='primary' onClick={() => history.push(`/customers/view/${order.customerData.uuid}`)}>View Customer Details</Button>
                    </Card>
                  </Col>
                </Row>

                <hr />

                <Card title='Problem Description'>
                  <Editor
                    readOnly
                    defaultValue={order.description}
                  />
                </Card>

                {
                  order.machinesData && order.machinesData.length > 0 &&
                    <>
                      <hr />
                      <Card title={order.machinesData.length === 1 ? 'Machine' : 'Machines'}>
                        {
                          order.machinesData.map(machine => {
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
                                  defaultValue={order.intakeConditions.filter(c => c.machine === machine.uuid)[0].value}
                                  style={{ fontSize: '1em', marginLeft: '1em' }}
                                />

                                <p style={{ fontSize: '1.5em' }}><strong>{order.intakeDescriptions.filter(d => d.machine === machine.uuid)[0].value}</strong></p>
                                <Input.Password readOnly value={order.intakePasswords.filter(p => p.machine === machine.uuid)[0].value} />
                              </Card.Grid>
                            )
                          })
                        }
                      </Card>
                    </>
                }

                {
                  intakePhotos && intakePhotos.length > 0 &&
                    <>
                      <hr />
                      <Card title='Intake Photos'>
                        {
                          intakePhotos.map(photo => {
                            return (
                              <Card.Grid
                                key={Math.random().toString(36)}
                                style={{ width: '25%', textAlign: 'center' }}
                                onClick={() => openLightbox(photo.uuid)}
                              >
                                <img alt='Intake condition' src={photo.data.uri} style={{ width: '100%', position: 'relative', zIndex: 100000 }} />
                              </Card.Grid>
                            )
                          })
                        }
                      </Card>
                    </>
                }

                {
                  order.accessories && order.accessories.length > 0 &&
                    <>
                      <hr />
                      <Card title='Accessories'>
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

                <hr />

                <pre>{JSON.stringify(order, null, 2)}</pre>
              </div>
          }
        </Layout>
      </Layout>
    </Layout>
  )
}

export default ViewOrder
