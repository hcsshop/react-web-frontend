import React, { useState, useContext } from 'react'
import { Alert, Form, Input, Button } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { Redirect } from 'react-router-dom'

import { store } from '../../store'
import client from '../../feathers/client'

const Login = () => {
  const [alert, setAlert] = useState(null)
  const Store = useContext(store)
  const { state, dispatch } = Store

  const onFinish = async values => {
    try {
      const result = await client.authenticate({
        strategy: 'local',
        email: values.email,
        password: values.password
      })

      const settings = {}
      const settingsData = await client.service('settings').find({ query: { $limit: -1 } })
      settingsData.forEach(setting => { settings[setting.key] = setting })

      dispatch({ type: 'update', payload: { authorized: true, token: result.accessToken, user: result.user, settings } })
      setAlert({ type: 'success', message: 'All set! One moment..' })
    } catch (err) {
      if (err.name === 'NotAuthenticated') return setAlert({ type: 'error', message: 'Invalid login credentials' })
      if (err.name === 'TypeError') return setAlert({ type: 'error', message: 'Could not contact server' })
    }
  }

  const onFinishFailed = errorInfo => {
    console.log('Failed:', errorInfo)
  }

  const layout = {
    labelCol: { span: 8 },
    wrapperCol: { span: 16 }
  }

  const tailLayout = {
    wrapperCol: { offset: 8, span: 16 }
  }

  return (
    <>
      <Form
        {...layout}
        name='login-form'
        initialValues={process.env.REACT_APP_ENVIRONMENT === 'development' ? { email: 'admin@onrepair.shop', password: 'test' } : {}}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
      >
        <Form.Item
          label='Email Address'
          name='email'
          rules={[{ required: true, type: 'email', message: 'Please input your email address!' }]}
        >
          <Input autoFocus prefix={<UserOutlined />} />
        </Form.Item>

        <Form.Item
          label='Password'
          name='password'
          rules={[{ required: true, message: 'Please input your password!' }]}
        >
          <Input.Password prefix={<LockOutlined />} />
        </Form.Item>

        {
          alert &&
            <Form.Item {...tailLayout}>
              <Alert type={alert.type} message={alert.message} showIcon closable />
            </Form.Item>
        }

        <Button block type='primary' size='large' htmlType='submit'>
          Login
        </Button>
      </Form>

      {state.authorized && <Redirect to='/' />}
    </>
  )
}

export default Login
