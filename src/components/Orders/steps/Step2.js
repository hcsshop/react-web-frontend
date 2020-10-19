import React, { useEffect, useState } from 'react'
import { renderToString } from 'react-dom/server'
import { AutoComplete, Button, Card, Col, Input, List, Row } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

import Loader from '../../Loader/Loader'
import client from '../../../feathers/client'

export default ({ customerData, orderData, updateOrder }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [machines, setMachines] = useState([])
  const [machineSearchValue, setMachineSearchValue] = useState('')
  const [manufacturers, setManufacturers] = useState([])
  const [models, setModels] = useState([])
  const [selectedMachines, setSelectedMachines] = useState([])
  const [selectedManufacturer, setSelectedManufacturer] = useState(null)
  const [selectedModel, setSelectedModel] = useState(null)
  const [serial, setSerial] = useState('')

  useEffect(() => {
    if (orderData.machines && orderData.machines.length > 0) {
      setSelectedMachines(orderData.machines)
    }
  }, [orderData])

  useEffect(() => {
    setManufacturers(['Acer', 'Apple', 'ASUS', 'Dell', 'Google', 'Huawei', 'HP', 'Lenovo', 'Microsoft', 'Motorola', 'Panasonic', 'Samsung', 'Sony'].map(value => ({ value })))
    setModels([].map(value => ({ value }))) // TODO: make this do magic
    setIsLoading(false)
  }, [machines])

  useEffect(() => {
    updateOrder({ machines: selectedMachines })
  }, [selectedMachines, updateOrder])

  // const filterMachines = (inputValue, option) => {
  //   if (typeof inputValue !== 'string') return false
  //   const search = inputValue.toUpperCase()
  //   // console.log({ search, option: renderToString(option.value) })
  //   return renderToString(option.value).toUpperCase().includes(search)
  // }

  const onSelectMachine = async machine => {
    const raw = renderToString(machine)
    const match = raw.match(/([a-f]|[0-9]|-){36}/)
    if (!match || match.length === 0) return false
    const uuid = match[0]
    const result = await client.service('machines').get(uuid)
    setSelectedMachines([...selectedMachines, result])
    setMachineSearchValue('')
  }

  const addMachine = async () => {
    console.log('addMachine:', { selectedManufacturer, selectedModel, serial })
    const result = await client.service('machines').create({
      customer: customerData ? customerData.uuid : null,
      manufacturer: selectedManufacturer,
      model: selectedModel,
      serial: serial
    })

    console.log({ result })

    setSelectedMachines([...selectedMachines, result])
  }

  const onSearchMachines = async search => {
    if (typeof search !== 'string') return

    if (!search || search === '') return setMachineSearchValue('')
    if (search === machineSearchValue) return false
    setMachineSearchValue(search)
    if (search.length < 3) return setMachines([])

    const result = await client.service('machines').find({ query: { $limit: -1, $search: search } })
    setMachines(result)
  }

  return (
    <>
      {isLoading && <Loader text='Loading, one moment..' />}

      {
        !isLoading &&
          <>
            <Card
              title={<h4>Selected Machines</h4>}
            >
              <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                <Col className='gutter-row' xs={24} xl={24} style={{ marginBottom: '2em' }}>
                  <div>
                    <AutoComplete
                      autoFocus
                      defaultActiveFirstOption
                      placeholder='Search for an existing Machine..'
                      style={{ width: '100%' }}
                      value={machineSearchValue}
                      onChange={onSearchMachines}
                      // filterOption={filterMachines}
                      onSelect={m => onSelectMachine(m)}
                      options={machines.map(m => {
                        return (
                          {
                            key: m.uuid,
                            value: (
                              <div className='order-new-machine-autocomplete-list-item'>
                                <h6>{m.manufacturer} {m.model}</h6>
                                <span>(Serial: <span className='mono'>{m.serial}</span>)</span>
                                <b>&bull;</b>
                                <span>[UUID: <span className='mono'>{m.uuid}</span>]</span>
                              </div>
                            )
                          }
                        )
                      })}
                    />
                    <hr />
                  </div>

                  <List
                    header={<strong>These machines will be attached to the new Work Order</strong>}
                    bordered
                    dataSource={selectedMachines}
                    locale={{ emptyText: 'No machines added' }}
                    renderItem={item => (
                      <List.Item key={item.uuid} size='small'>
                        <strong>UUID: </strong> <span className='mono'>{item.uuid}</span>
                        <br />
                        <strong>Manufacturer:</strong> {item.manufacturer}
                        <br />
                        <strong>Model:</strong> {item.model}
                        <br />
                        <strong>Serial:</strong> {item.serial}
                      </List.Item>
                    )}
                  />
                </Col>
              </Row>
            </Card>

            <br />

            <Card
              title={<h4>New Machine</h4>}
              subtitle='If this is a new machine, add it below.'
            >
              <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                <Col className='gutter-row' xs={24} xl={6} style={{ marginBottom: '2em' }}>
                  <h5>Manufacturer</h5>
                  <AutoComplete
                    filterOption
                    className='w-100'
                    onChange={setSelectedManufacturer}
                    options={[
                      {
                        label: 'Manufacturers',
                        options: manufacturers
                      }
                    ]}
                  >
                    <Input.Search placeholder='Manufacturer' />
                  </AutoComplete>
                </Col>

                <Col className='gutter-row' xs={24} xl={6} style={{ marginBottom: '2em' }}>
                  <h5>Model</h5>
                  <AutoComplete
                    filterOption
                    className='w-100'
                    onChange={setSelectedModel}
                    options={[
                      {
                        label: 'Models',
                        options: models
                      }
                    ]}
                  >
                    <Input.Search placeholder='Model' />
                  </AutoComplete>
                </Col>

                <Col className='gutter-row' xs={24} xl={6} style={{ marginBottom: '2em' }}>
                  <h5>Serial Number</h5>
                  <Input
                    value={serial}
                    placeholder='Serial Number (or SNID/Service Tag)'
                    onChange={e => setSerial(e.target.value)}
                    className='w-100'
                  />
                </Col>

                <Col className='gutter-row' xs={24} xl={6} style={{ marginBottom: '2em' }}>
                  <h5>&nbsp;</h5>
                  <Button block type='primary' onClick={addMachine}>
                    <PlusOutlined style={{ position: 'relative', top: '-3px' }} />
                    <span>Add Machine</span>
                  </Button>
                </Col>
              </Row>
            </Card>
          </>
      }
    </>
  )
}
