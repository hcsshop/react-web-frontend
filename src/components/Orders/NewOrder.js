import React, { useCallback, useEffect, useState } from 'react'
import { Layout, Steps, Breadcrumb, PageHeader, Button, message } from 'antd'
import { Link, useHistory } from 'react-router-dom'
import useSound from 'use-sound'

import TopNav from '../TopNav/TopNav'
import Loader from '../Loader/Loader'
import client from '../../feathers/client'

import soundSuccess from '../../assets/sounds/success.mp3'
import soundFailure from '../../assets/sounds/unsuccessful.mp3'

import Step1 from './steps/Step1'
import Step2 from './steps/Step2'
import Step3 from './steps/Step3'
import Step4 from './steps/Step4'
const { Step } = Steps

const NewOrder = () => {
  const history = useHistory()

  const [playSuccess] = useSound(soundSuccess)
  const [playFailure] = useSound(soundFailure)

  const [isLoading, setIsLoading] = useState(false)
  const [filteredCustomers, setFilteredCustomers] = useState([])
  const [customerData, setCustomerData] = useState(null)
  const [customerProvided, setCustomerProvided] = useState(false)
  const [orderData, setOrderData] = useState({})
  const [steps, setSteps] = useState([])
  const [currentStep, setCurrentStep] = useState(0)
  const [customerSearch, setCustomerSearch] = useState('')

  const updateOrder = useCallback(async data => {
    setOrderData(o => ({ ...o, ...data }))
  }, [])

  const createOrder = async () => {
    setIsLoading(true)
    const data = {}
    if (orderData.customer) data.customer = orderData.customer.uuid
    if (orderData.description) data.description = orderData.description

    data.machines = []
    orderData.machines.forEach(machine => data.machines.push(machine.uuid))

    data.intakeConditions = []
    data.intakeDescriptions = []
    data.intakePasswords = []
    if (orderData.intakeConditions) Object.keys(orderData.intakeConditions).forEach(uuid => data.intakeConditions.push({ machine: uuid, value: orderData.intakeConditions[uuid] }))
    if (orderData.intakeDescriptions) Object.keys(orderData.intakeDescriptions).forEach(uuid => data.intakeDescriptions.push({ machine: uuid, value: orderData.intakeDescriptions[uuid] }))
    if (orderData.intakePasswords) Object.keys(orderData.intakePasswords).forEach(uuid => data.intakePasswords.push({ machine: uuid, value: orderData.intakePasswords[uuid] }))

    const photoProcessor = async photo => {
      client.service('storage').timeout = 90000
      const result = await client.service('storage').create({
        file: photo.datauri,
        filename: `${Math.random().toString(36).split('.')[1]}.png`,
        folder: 'orders/intake-photos/',
        related: { machine: photo.machine }
      })

      return { machine: photo.machine, value: result.uuid }
    }

    if (orderData.intakePhotos) data.intakePhotos = await Promise.all(orderData.intakePhotos.map(photo => photoProcessor(photo)))
    if (orderData.selectedAccessories) data.accessories = orderData.selectedAccessories

    try {
      const result = await client.service('orders').create(data)
      playSuccess()
      history.push(`/orders/view/${result.uuid}`)
    } catch (err) {
      playFailure()
      console.error(err)
      message.error('An error occurred creating the order. Please try again.', 10)
      setIsLoading(false)
    }
  }

  const onSearchCustomer = useCallback(async search => {
    setCustomerSearch(search)
    if (!search || search === '') return setCustomerSearch('')
    if (search === customerSearch) return false
    if (search.length < 3) return setFilteredCustomers([])

    const result = await client.service('customers').find({ query: { $limit: -1, $search: search } })
    setFilteredCustomers(result)
  }, [customerSearch])

  const onSelectCustomer = useCallback(async customer => {
    const result = await client.service('customers').get(customer)
    await updateOrder({ customer: result })
    setCustomerData(result)
    setCurrentStep(1)
  }, [updateOrder])

  const resetCustomer = () => {
    setCustomerData(null)
    setCustomerProvided(false)
  }

  useEffect(() => {
    const go = async () => {
      const cid = new URLSearchParams(window.location.search).get('customer')
      if (!cid) return
      const result = await client.service('customers').get(cid)
      setCustomerData(result)
      setCustomerProvided(true)
      onSelectCustomer(cid)
    }

    go()
  }, [onSelectCustomer])

  useEffect(() => {
    setSteps([
      {
        title: <strong>Customer Details</strong>,
        description: (customerData && customerData.profile.name.display) || 'On whose machine(s) are we working?',
        content: <Step1 customers={filteredCustomers} customerData={customerData} customerProvided={customerProvided} onSearchCustomer={onSearchCustomer} onSelectCustomer={onSelectCustomer} resetCustomer={resetCustomer} />
      },

      {
        title: 'Machine Details',
        description: orderData.machines ? (orderData.machines.length === 1 ? `${orderData.machines[0].manufacturer} ${orderData.machines[0].model} (Serial: ${orderData.machines[0].serial})` : `${orderData.machines.length} machines`) : 'On which machine(s) are we working?',
        content: <Step2 orderData={orderData} updateOrder={updateOrder} customerData={customerData} />
      },

      {
        title: 'Order Details',
        description: 'What seems to be the problem?',
        content: <Step3 orderData={orderData} updateOrder={updateOrder} />
      },

      {
        title: 'Final Review',
        description: 'Is everything accurate?',
        content: <Step4 orderData={orderData} updateOrder={updateOrder} />
      }
    ])
  }, [customerData, customerProvided, filteredCustomers, onSelectCustomer, onSearchCustomer, orderData, updateOrder])

  const nextStep = () => { setCurrentStep(currentStep + 1) }
  const previousStep = () => { setCurrentStep(currentStep - 1) }

  return (
    <Layout>
      <TopNav />
      <Layout>
        <Layout style={{ padding: '0 24px 24px', minHeight: '100vh' }}>
          <Breadcrumb style={{ margin: '16px 0' }}>
            <Breadcrumb.Item>{process.env.REACT_APP_SERVICESHOP_NAME || 'Home'}</Breadcrumb.Item>
            <Breadcrumb.Item><Link to='/orders'>Orders</Link></Breadcrumb.Item>
            <Breadcrumb.Item>New Order</Breadcrumb.Item>
          </Breadcrumb>

          <PageHeader
            title='New Order'
            onBack={() => history.goBack()}
          />

          {/* <pre>{JSON.stringify({ orderData }, null, 2)}</pre> */}

          {isLoading && <Loader text='Creating order, please wait..' />}

          {
            !isLoading && steps.length > 0 &&
              <div className='step-progress'>
                <Steps current={currentStep}>
                  {
                    steps.map(step => (
                      <Step
                        key={step.title}
                        title={step.title}
                        subtitle={step.subtitle}
                        description={step.description}
                      />
                    ))
                  }
                </Steps>

                <hr />
                <div className='steps-content'>{steps[currentStep].content}</div>
                <hr />
                <div className='steps-action float-right'>
                  {
                    currentStep < steps.length - 1 && (
                      <Button type='primary' size='large' onClick={nextStep}>
                        Next
                      </Button>
                    )
                  }

                  {
                    currentStep === steps.length - 1 && (
                      <Button type='primary' size='large' onClick={createOrder}>
                        Create Order
                      </Button>
                    )
                  }

                  {
                    currentStep > 0 && (
                      <Button size='large' style={{ margin: '0 8px' }} onClick={previousStep}>
                        Previous
                      </Button>
                    )
                  }
                </div>
              </div>
          }
        </Layout>
      </Layout>
    </Layout>
  )
}

export default NewOrder
