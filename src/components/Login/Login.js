import React, { useState, useEffect } from 'react'
import { Card } from 'antd'
import { Link } from 'react-router-dom'

import 'animate.css/animate.min.css'

import LoginForm from './LoginForm'
import client from '../../feathers/client'

const Login = () => {
  const [shopName, setShopName] = useState(false)

  useEffect(() => {
    const go = async () => {
      try {
        const name = await client.service('public').get('shop.name')
        console.log(`Welcome to ${name}`)
        setShopName(name)
      } catch (err) {
        console.error(err)
      }
    }

    if (!shopName) go()
  }, [shopName])

  return (
    <>
      <div id='login-screen'>
        <div className='login-screen-outer'>
          <div className='login-screen-middle'>
            <div className='login-screen-inner'>
              {shopName && <h1 className='dialog-page-title animate__animated animate__slideInDown animate__fast'>{shopName}</h1>}

              <Card
                className='login-card animate__animated animate__zoomIn'
                title={<h2>Login</h2>}
                extra={<Link to='/login/recover'>Forgot password?</Link>}
              >
                <LoginForm />
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Login
