/* global FileReader */

import React, { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Breadcrumb, Button, Card, Input, Layout, Upload, message } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import Camera, { FACING_MODES } from 'react-html5-camera-photo'

import 'react-html5-camera-photo/build/css/index.css'

import TopNav from '../TopNav/TopNav'
import client from '../../feathers/client'

export default () => {
  const [smsTo, smsSetTo] = useState('')
  const [smsText, smsSetText] = useState('')
  const [smsStatus, smsSetStatus] = useState({})
  const [emailTo, emailSetTo] = useState('')
  const [emailText, emailSetText] = useState('')
  const [emailStatus, emailSetStatus] = useState({})
  const [emailSubject, emailSetSubject] = useState('')

  const smsSend = useCallback(() => {
    const go = async () => {
      try {
        await client.service('sms-twilio').create({ to: smsTo, text: smsText })
        smsSetStatus({ type: 'success', text: 'SMS sent successfully!' })
        smsSetTo('')
        smsSetText('')
      } catch (err) {
        console.error(err)
        smsSetStatus({ type: 'danger', text: 'Failed to send SMS message' })
        smsSetTo('')
        smsSetText('')
      }
    }

    go()
  }, [smsTo, smsText])

  const emailSend = useCallback(() => {
    const go = async () => {
      try {
        await client.service('email-mailgun').create({ to: emailTo, subject: emailSubject, html: emailText })
        emailSetStatus({ type: 'success', text: 'Email sent successfully!' })
        emailSetTo('')
        emailSetSubject('')
        emailSetText('')
      } catch (err) {
        console.error(err)
        emailSetStatus({ type: 'danger', text: 'Failed to send email message' })
        emailSetTo('')
        emailSetSubject('')
        emailSetText('')
      }
    }

    go()
  }, [emailTo, emailSubject, emailText])

  // const storageUpload = async ({ onProgress, onError, onSuccess, data, filename, file }) => {
  //   console.log('storageUpload', { data, filename, file })
  //   onSuccess()
  // }

  const storageUpload = async ({ file, onSuccess, onError }) => {
    const reader = new FileReader()
    reader.onloadend = async obj => {
      const data = obj.srcElement.result

      try {
        client.service('storage').timeout = 60000
        const result = await client.service('storage').create({ filename: file.name, file: data })
        console.log({ result })
        onSuccess(result)
      } catch (err) {
        console.error(err)
        message.error('Error uploading the file. Please try again.')
      }
    }

    reader.readAsDataURL(file)
  }

  const savePhoto = async data => {
    client.service('storage').timeout = 90000
    const result = await client.service('storage').create({ storageType: 's3', folder: 'photos', filename: `${Math.random().toString(36).split('.')[1]}.png`, file: data })
    console.log({ savePhoto: result })
  }

  return (
    <Layout>
      <TopNav />
      <Layout>
        <Layout style={{ padding: '0 24px 24px', minHeight: '100vh' }}>
          <Breadcrumb style={{ margin: '16px 0' }}>
            <Breadcrumb.Item><Link to='/'>{process.env.REACT_APP_SERVICESHOP_NAME || 'Home'}</Link></Breadcrumb.Item>
            <Breadcrumb.Item>Tools</Breadcrumb.Item>
          </Breadcrumb>

          <h3>Tools</h3>

          <div className='animate__animated animate__slideInUp animate_faster'>
            <Card
              title='Send text message'
              extra={<Button type='primary' onClick={smsSend}>Send</Button>}
              actions={[
                smsStatus.type && <Alert type={smsStatus.type} message={smsStatus.text} />
              ]}
            >
              <Input placeholder='To: +15550001234' value={smsTo} onChange={e => smsSetTo(e.target.value)} />
              <Input.TextArea placeholder='Enter your message' value={smsText} onChange={e => smsSetText(e.target.value)} />
            </Card>

            <hr />

            <Card
              title='Send an email'
              extra={<Button type='primary' onClick={emailSend}>Send</Button>}
              actions={[
                emailStatus.type && <Alert type={emailStatus.type} message={emailStatus.text} />
              ]}
            >
              <Input placeholder='To: example@email.com' value={emailTo} onChange={e => emailSetTo(e.target.value)} />
              <Input placeholder='Subject' value={emailSubject} onChange={e => emailSetSubject(e.target.value)} />
              <Input.TextArea placeholder='Enter your message' value={emailText} onChange={e => emailSetText(e.target.value)} />
            </Card>

            <hr />

            <Card title='S3 Storage'>
              <Upload.Dragger
                name='file'
                customRequest={storageUpload}
              >
                <p className='ant-upload-drag-icon'>
                  <InboxOutlined />
                </p>
                <p className='ant-upload-text'>Click or drag file to this area to upload</p>
                {/* <p className='ant-upload-hint'></p> */}
              </Upload.Dragger>
            </Card>

            <hr />

            <Card title='Take Photo'>
              <Camera
                onTakePhoto={savePhoto}
                idealFacingMode={FACING_MODES.ENVIRONMENT}
              />
            </Card>
          </div>
        </Layout>
      </Layout>
    </Layout>
  )
}
