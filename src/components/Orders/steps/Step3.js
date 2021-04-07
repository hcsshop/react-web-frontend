import React, { useEffect, useState } from 'react'
import { Card, Col, Input, Rate, Row, Select } from 'antd'
import { CameraOutlined } from '@ant-design/icons'
import Camera, { FACING_MODES } from 'react-html5-camera-photo'
import ReactMde from 'react-mde'
import MarkdownIt from 'markdown-it'
// import { debounce } from 'lodash'

import 'react-mde/lib/styles/css/react-mde-all.css'

import client from '../../../feathers/client'

const markdown = new MarkdownIt()

export default ({ orderData, updateOrder }) => {
  const [intakeConditions, setIntakeConditions] = useState({})
  const [intakeDescriptions, setIntakeDescriptions] = useState({})
  const [intakePasswords, setIntakePasswords] = useState({})
  const [intakePhotos, setIntakePhotos] = useState([])
  const [intakeShowCamera, setIntakeShowCamera] = useState(false)
  const [possibleAccessories, setPossibleAccessories] = useState([])
  const [selectedAccessories, setSelectedAccessories] = useState([])
  const [description, setDescription] = useState('')
  const [selectedEditorTab, setSelectedEditorTab] = useState('write')

  const conditionNames = ['Destroyed', 'Damaged', 'Fair', 'Good', 'Perfect'] // TODO: Store this in settings

  useEffect(() => {
    if (orderData.intakeConditions) setIntakeConditions(orderData.intakeConditions)
    if (orderData.intakeDescriptions) setIntakeDescriptions(orderData.intakeDescriptions)
    if (orderData.intakePasswords) setIntakePasswords(orderData.intakePasswords)
    if (orderData.intakePhotos) setIntakePhotos(orderData.intakePhotos)
    if (orderData.description) setDescription(orderData.description)
    if (orderData.selectedAccessories) setSelectedAccessories(orderData.selectedAccessories)
  }, [orderData])

  useEffect(() => {
    updateOrder({ description, intakeConditions, intakeDescriptions, intakePasswords, intakePhotos, selectedAccessories })
  }, [description, intakeConditions, intakeDescriptions, intakePasswords, intakePhotos, selectedAccessories, updateOrder])

  useEffect(() => {
    const go = async () => {
      try {
        const result = await client.service('settings').get('orders.accessories')
        setPossibleAccessories(JSON.parse(result.text))
      } catch (err) {
        console.error(err)
        setPossibleAccessories(['Power Adapter', 'Case/Bag', 'Documentation', 'USB Dongle'])
      }
    }

    if (possibleAccessories.length === 0) go()
  }, [possibleAccessories])

  const takeIntakePhoto = (machine, data) => {
    setIntakeShowCamera(false)
    setIntakePhotos(i => [...i, { tmpKey: Math.random().toString(36), machine: machine.uuid, datauri: data }])
  }

  const deleteIntakePhoto = key => {
    setIntakePhotos(i => i.filter(p => p.tmpKey !== key))
  }

  // const editorUploadImage = async file => {
  //   const finishReading = () => new Promise((resolve, reject) => {
  //     const reader = new FileReader()
  //     reader.onloadend = async obj => {
  //       const data = obj.srcElement.result

  //       try {
  //         resolve(data)
  //       } catch (err) {
  //         console.error(err)
  //         message.error('Error uploading the file. Please try again.')
  //       }
  //     }

  //     reader.readAsDataURL(file)
  //   })

  //   return await finishReading()
  // }

  // const onEditorChange = debounce(text => {
  //   setDescription(text())
  // }, 250)

  return (
    <>
      <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
        <Col className='gutter-row' xs={24} xl={24} style={{ marginBottom: '2em' }}>
          {
            orderData && orderData.machines && orderData.machines.map(machine => {
              return (
                <Card
                  key={machine.uuid}
                  style={{ marginTop: '2em' }}
                  title={<span>Intake Details of {machine.manufacturer} {machine.model} (Serial: <span className='mono'>{machine.serial}</span>)</span>}
                >
                  <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col className='gutter-row' xs={24} xl={1} style={{ marginBottom: '2em' }}>
                      <CameraOutlined
                        className={intakeShowCamera ? 'animate__animated animate__infinite animate__pulse animate__faster' : ''}
                        onClick={e => setIntakeShowCamera(isc => ({ ...isc, ...{ [machine.uuid]: !Boolean(intakeShowCamera[machine.uuid]) } }))} // eslint-disable-line
                        style={{ fontSize: '2em', paddingTop: '5px', cursor: 'pointer' }}
                      />

                      {
                        intakeShowCamera[machine.uuid] &&
                          <Camera
                            onTakePhoto={data => takeIntakePhoto(machine, data)}
                            idealFacingMode={FACING_MODES.ENVIRONMENT}
                          />
                      }
                    </Col>
                    <Col className='gutter-row' xs={24} xl={4} style={{ marginBottom: '2em' }}>
                      {/* <Rate tooltips={conditionNames} value={intakeConditions[machine.uuid]} onChange={value => setIntakeConditions({ ...intakeConditions, ...{ [`${machine.uuid}`]: value } })} /> */}
                      {/* Temporary fix */}
                      <input value={intakeConditions[machine.uuid]} placeholder='0-5' onChange={e => setIntakeConditions({ ...intakeConditions, ...{ [`${machine.uuid}`]: e.target.value } })} />
                      
                    </Col>
                    <Col className='gutter-row' xs={24} xl={9} style={{ marginBottom: '2em' }}>
                      <Input.Password
                        placeholder='Enter the password for this machine'
                        value={intakePasswords[machine.uuid]}
                        onChange={e => setIntakePasswords({ ...intakePasswords, ...{ [`${machine.uuid}`]: e.target.value } })}
                      />
                    </Col>
                    <Col className='gutter-row' xs={24} xl={10} style={{ marginBottom: '2em' }}>
                      <Input
                        placeholder='Describe missing parts, screws, or other damage and abnormalities'
                        value={intakeDescriptions[machine.uuid]}
                        onChange={e => setIntakeDescriptions({ ...intakeDescriptions, ...{ [`${machine.uuid}`]: e.target.value } })}
                      />
                    </Col>
                  </Row>

                  {
                    intakePhotos.length > 0 &&
                      <Card>
                        {
                          intakePhotos.map(photo => {
                            if (photo.machine !== machine.uuid) return null
                            return (
                              <Card.Grid
                                key={photo.tmpKey}
                                style={{ minHeight: '200px', width: '25%', textAlign: 'center', backgroundImage: `url(${photo.datauri})`, backgroundSize: 'cover' }}
                                onClick={() => deleteIntakePhoto(photo.tmpKey)}
                              >
                                {/* <img alt='Intake condition' src={photo.datauri} style={{ width: '100%', position: 'relative', zIndex: 100000 }} /> */}
                              </Card.Grid>
                            )
                          })
                        }
                      </Card>
                  }
                </Card>
              )
            })
          }
        </Col>
      </Row>

      <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
        <Col className='gutter-row' xs={24} xl={24} style={{ marginBottom: '2em' }}>
          <Card title='Accessories'>
            <Select
              mode='tags'
              style={{ width: '100%' }}
              placeholder='Enter accessories that are now in your custody'
              onChange={setSelectedAccessories}
            >
              {
                possibleAccessories && possibleAccessories.map(accessory => {
                  return (
                    <Select.Option key={accessory}>{accessory}</Select.Option>
                  )
                })
              }
            </Select>
          </Card>
        </Col>
      </Row>

      <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
        <Col className='gutter-row' xs={24} xl={24} style={{ marginBottom: '2em' }}>

          <Card title='Problem Description'>
            {/* <Editor
              placeholder='What services need to be provided?'
              uploadImage={editorUploadImage}
              onChange={onEditorChange}
            /> */}

            <ReactMde
              value={description}
              onChange={setDescription}
              selectedTab={selectedEditorTab}
              onTabChange={setSelectedEditorTab}
              generateMarkdownPreview={md => Promise.resolve(markdown.render(md))}
            />
          </Card>
        </Col>
      </Row>
    </>
  )
}
