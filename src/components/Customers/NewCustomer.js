/* global localStorage */

import React, { useState, useEffect } from 'react'
import { Layout, Breadcrumb, PageHeader, Form, Input, Button, Checkbox, Card, Row, Col, message } from 'antd'
import { Link, useHistory } from 'react-router-dom'
import PlacesAutocomplete from 'react-places-autocomplete'
// import faker from 'faker'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'

import './styles/NewCustomer.scss'
import TopNav from '../TopNav/TopNav'
import Loader from '../Loader/Loader'
import client from '../../feathers/client'

const NewCustomer = () => {
  const [initialValues] = useState({})
  const [displayName, setDisplayName] = useState('')
  const [showCustomerDetails, setShowCustomerDetails] = useState(false)
  const [billingAddress, setBillingAddress] = useState('')
  const [physicalAddress, setPhysicalAddress] = useState('')
  const [isPhysicalSameAsBilling, setIsPhysicalSameAsBilling] = useState(false)
  const [isCompany, setIsCompany] = useState(false)
  const [isTaxExempt, setIsTaxExempt] = useState(false)
  const [primaryPhone, setPrimaryPhone] = useState('')
  const [mobilePhone, setMobilePhone] = useState('')
  const [faxPhone, setFaxPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const history = useHistory()

  // A little workaround for react-places-autocomplete to handle async loading of maps js api
  const [windowGoogle, setWindowGoogle] = useState(null)
  const googleApiWatcher = setInterval(() => {
    if (window.google) {
      setWindowGoogle(window.google)
      clearInterval(googleApiWatcher)
    }
  }, 500)

  const onFinish = async values => {
    values.addressBilling = billingAddress
    values.addressPhysical = physicalAddress
    values.addressPhysicalSameAsBilling = isPhysicalSameAsBilling

    setIsLoading(true)

    try {
      const customer = {
        email: values.email,
        profile: {
          name: {
            first: values.firstName,
            middle: values.middleName,
            last: values.lastName,
            display: displayName
          },

          address: {
            billing: values.addressBilling,
            physical: values.addressPhysical,
            physicalSameAsBilling: values.addressPhysicalSameAsBilling
          },

          phone: {
            primary: { number: `+${primaryPhone}` },
            mobile: { number: `+${mobilePhone}` },
            fax: { number: `+${faxPhone}` }
          },

          company: {
            isCompany,
            taxExempt: isTaxExempt,
            name: values.companyName,
            taxId: values.companyTaxId,
            contact: values.companyContact,
            email: values.companyEmail,
            website: values.companyWebsite
          }
        }
      }

      let qbResult
      const result = await client.service('customers').create(customer)
      const qbEnabled = await client.service('settings').get('quickbooks.enabled')
      if (qbEnabled) qbResult = await client.service('quickbooks').create({ type: 'customer', customer: result })
      if (qbEnabled && !qbResult) throw new Error('Did not get a result from quickbooks')
      localStorage.removeItem('customers')
      setIsLoading(false)
      history.replace(`/customers/view/${result.uuid}`)
    } catch (err) {
      console.error(err)
      message.error('Error creating customer', 10)
      setIsLoading(false)
    }
  }

  const onFail = err => {
    console.error(err)
  }

  const handleAddressCopy = e => {
    if (e.target.checked) setPhysicalAddress(billingAddress)
    setIsPhysicalSameAsBilling(e.target.checked)
  }

  const handleIsCompanyCheckbox = e => {
    const { checked } = e.target
    checked ? setShowCustomerDetails(true) : setShowCustomerDetails(false)
    setIsCompany(checked)
  }

  const handleIsTaxExemptCheckbox = e => {
    const { checked } = e.target
    setIsTaxExempt(checked)
  }

  const handleBillingPlaceChange = address => {
    address = typeof address === 'string' ? address : address.target.value
    setBillingAddress(address)
  }

  const handleBillingPlaceSelect = address => {
    setBillingAddress(address)
  }

  const handlePhysicalPlaceChange = address => {
    address = typeof address === 'string' ? address : address.target.value
    setPhysicalAddress(address)
  }

  const handlePhysicalPlaceSelect = address => {
    setPhysicalAddress(address)
  }

  const validationRules = {
    email: [{ type: 'email', message: 'That is not a valid email address' }]
  }

  // useEffect(() => {
  //   setInitialValues({
  //     firstName: faker.name.firstName(),
  //     middleName: `${faker.name.firstName().split('')[0]}.`,
  //     lastName: faker.name.lastName(),
  //     email: faker.internet.email(),
  //     companyName: faker.company.companyName(),
  //     companyTaxId: faker.random.number(),
  //     companyContact: faker.name.findName(),
  //     companyEmail: faker.internet.email(),
  //     companyWebsite: faker.internet.url()
  //   })

  //   setDisplayName(faker.name.findName())
  //   setPrimaryPhone('1-' + faker.phone.phoneNumberFormat())
  //   setMobilePhone('1-' + faker.phone.phoneNumberFormat())
  //   setFaxPhone('1-' + faker.phone.phoneNumberFormat())
  // }, [])

  useEffect(() => {
    return () => { window.google = null; setWindowGoogle(null) }
  }, [])

  // const handlePrimaryPhoneChange = async data => {
  //   setPrimaryPhone(`+${data}`)
  // }

  // const handleMobilePhoneChange = async data => {
  //   console.log('handleMobilePhoneChange', data)
  // }

  // const handleFaxPhoneChange = async data => {
  //   console.log('handleMobilePhoneChange', data)
  // }

  const handleNameChange = e => {
    const name = {
      first: document.getElementById('new-customer_firstName'),
      middle: document.getElementById('new-customer_middleName'),
      last: document.getElementById('new-customer_lastName')
    }

    const newDisplayName = `${name.first.value.trim()}${name.middle.value.trim() === '' ? '' : ' ' + name.middle.value.trim()}${name.last.value.trim() === '' ? '' : ' ' + name.last.value.trim()}`
    setDisplayName(newDisplayName)
  }

  return (
    <Layout>
      <TopNav />
      <Layout>
        <Layout style={{ padding: '0 24px 24px', minHeight: '100vh' }}>
          <Breadcrumb style={{ margin: '16px 0' }}>
            <Breadcrumb.Item>{process.env.REACT_APP_SERVICESHOP_NAME || 'Home'}</Breadcrumb.Item>
            <Breadcrumb.Item><Link to='/customers'>Customers</Link></Breadcrumb.Item>
            <Breadcrumb.Item>New Customer</Breadcrumb.Item>
          </Breadcrumb>

          <PageHeader
            title='New Customer'
            onBack={() => history.goBack()}
          />

          {isLoading && <Loader text='Creating customer, please wait..' />}

          {
            !isLoading && initialValues &&
              <Form
                name='new-customer'
                layout='horizontal'
                onFinish={onFinish}
                onFinishFailed={onFail}
                initialValues={initialValues}
              >
                <Card
                  title={
                    <div>
                      <strong>Basic Details</strong>
                    </div>
                  }
                  style={{ borderRadius: '3px', borderColor: '#999' }}
                >
                  <h6>Name</h6>
                  <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col className='gutter-row' xs={24} xl={8} style={{ marginBottom: '2em' }}>
                      <Form.Item label='' name='firstName'>
                        <Input placeholder='First Name' allowClear onChange={handleNameChange} required />
                      </Form.Item>
                    </Col>
                    <Col className='gutter-row' xs={24} xl={8} style={{ marginBottom: '2em' }}>
                      <Form.Item label='' name='middleName'>
                        <Input placeholder='Middle Name' allowClear onChange={handleNameChange} />
                      </Form.Item>
                    </Col>
                    <Col className='gutter-row' xs={24} xl={8} style={{ marginBottom: '2em' }}>
                      <Form.Item label='' name='lastName'>
                        <Input placeholder='Last Name' allowClear onChange={handleNameChange} required />
                      </Form.Item>
                    </Col>
                  </Row>

                  <h6>Display Name</h6>
                  <em><small>Must be unique among all customers</small></em>
                  <br />
                  <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col className='gutter-row' xs={24} xl={24} style={{ marginBottom: '2em' }}>
                      <input name='displayName' type='text' className='ant-input' placeholder='Display Name' value={displayName} onChange={e => setDisplayName(e.target.value)} required />
                    </Col>
                  </Row>

                  <h6>Email Address</h6>
                  <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col className='gutter-row' xs={24} xl={24} style={{ marginBottom: '2em' }}>
                      <Form.Item name='email' rules={validationRules.email}>
                        <Input placeholder='Email Address' type='email' required />
                      </Form.Item>
                    </Col>
                  </Row>

                  <h6>Phone</h6>
                  <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col className='gutter-row' xs={24} xl={8}>
                      <Form.Item>
                        <PhoneInput
                          name='phonePrimary'
                          preferredCountries={['ca', 'gb', 'us']}
                          country={process.env.REACT_APP_SERVICESHOP_PHONE_COUNTRY || 'us'}
                          value={primaryPhone}
                          // onChange={handlePrimaryPhoneChange}
                          onChange={setPrimaryPhone}
                          enableAreaCodes={['us', 'ca']}
                          enableAreaCodeStretch
                        />
                      </Form.Item>
                    </Col>
                    <Col className='gutter-row' xs={24} xl={8}>
                      <PhoneInput
                        name='phoneMobile'
                        preferredCountries={['ca', 'gb', 'us']}
                        country={process.env.REACT_APP_SERVICESHOP_PHONE_COUNTRY || 'us'}
                        value={mobilePhone}
                        // onChange={handleMobilePhoneChange}
                        onChange={setMobilePhone}
                      />
                    </Col>
                    <Col className='gutter-row' xs={24} xl={8}>
                      <PhoneInput
                        name='phoneFax'
                        preferredCountries={['ca', 'gb', 'us']}
                        country={process.env.REACT_APP_SERVICESHOP_PHONE_COUNTRY || 'us'}
                        value={faxPhone}
                        // onChange={handleFaxPhoneChange}
                        onChange={setFaxPhone}
                      />
                    </Col>
                  </Row>

                  <br />

                  <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col className='gutter-row' xs={24} xl={12} style={{ marginBottom: '2em' }}>
                      <h6>Billing Address</h6>
                      {!windowGoogle && <Input onChange={handleBillingPlaceChange} />}
                      {
                        windowGoogle &&
                          <PlacesAutocomplete
                            value={billingAddress}
                            onChange={handleBillingPlaceChange}
                            onSelect={handleBillingPlaceSelect}
                            searchOptions={{
                              types: ['address']
                            }}
                          >
                            {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
                              <div>
                                <input
                                  {...getInputProps({
                                    name: 'addressBilling',
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

                      <Form.Item label='Physical address same as billing?' name='addressPhysicalSameAsBilling' colon={false}>
                        <Checkbox onChange={handleAddressCopy} />
                      </Form.Item>
                    </Col>

                    <Col id='new-customer-physical-address-col' className='gutter-row' xs={24} xl={12} style={{ marginBottom: '2em' }}>
                      <h6>Physical Address</h6>
                      {!windowGoogle && <Input onChange={handlePhysicalPlaceChange} />}
                      {
                        windowGoogle &&
                          <PlacesAutocomplete
                            value={physicalAddress}
                            onChange={handlePhysicalPlaceChange}
                            onSelect={handlePhysicalPlaceSelect}
                          >
                            {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
                              <div>
                                <input
                                  {...getInputProps({
                                    name: 'addressPhysical',
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
                    </Col>
                  </Row>
                </Card>

                <br />

                <Card
                  title={<div><strong>Company Details</strong></div>}
                  style={{ borderRadius: '3px', borderColor: '#999' }}
                >
                  <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col className='gutter-row' xs={24} xl={8} style={{ marginBottom: '2em' }}>
                      <Form.Item label='Is this customer a company?' name='isCompany' colon={false} labelAlign='right'>
                        <Checkbox checked={isCompany} onChange={handleIsCompanyCheckbox} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <div id='new-customer-company-details' style={{ display: showCustomerDetails ? 'block' : 'none' }}>
                    <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                      <Col className='gutter-row' xs={24} xl={8} style={{ marginBottom: '2em' }}>
                        <Form.Item name='companyName'>
                          <Input placeholder='Company Name' />
                        </Form.Item>
                      </Col>
                      <Col className='gutter-row' xs={24} xl={8} style={{ marginBottom: '2em' }}>
                        <Form.Item name='companyTaxId'>
                          <Input placeholder='Tax ID' />
                        </Form.Item>
                      </Col>
                      <Col className='gutter-row' xs={24} xl={8} style={{ marginBottom: '2em' }}>
                        <Form.Item label='Is this company tax exempt?' name='companyTaxExempt' colon={false} onChange={handleIsTaxExemptCheckbox}>
                          <Checkbox checked={isTaxExempt} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                      <Col className='gutter-row' xs={24} xl={8} style={{ marginBottom: '2em' }}>
                        <Form.Item name='companyContact'>
                          <Input placeholder='Company Contact Name' />
                        </Form.Item>
                      </Col>
                      <Col className='gutter-row' xs={24} xl={8} style={{ marginBottom: '2em' }}>
                        <Form.Item name='companyEmail'>
                          <Input placeholder='Company Email' />
                        </Form.Item>
                      </Col>
                      <Col className='gutter-row' xs={24} xl={8} style={{ marginBottom: '2em' }}>
                        <Form.Item name='companyWebsite'>
                          <Input placeholder='Company Website' />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                </Card>

                <hr />
                <Button type='primary' size='large' block htmlType='submit'>
                  Save Customer
                </Button>
                <hr />
              </Form>
          }
        </Layout>
      </Layout>
    </Layout>
  )
}

export default NewCustomer
