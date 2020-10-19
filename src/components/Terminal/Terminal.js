import React from 'react'
import { Link } from 'react-router-dom'
import { Breadcrumb, Layout } from 'antd'
import Terminal from 'terminal-in-react'

import TopNav from '../TopNav/TopNav'
import ORS from '../../ORS/ORS'

const descriptions = { show: false }
for (const cmd in ORS.commands) descriptions[cmd] = ORS.commands[cmd].options[0].description

export default () => {
  return (
    <Layout>
      <TopNav />
      <Layout>
        <Layout style={{ padding: '0 24px 24px', minHeight: '100vh' }}>
          <Breadcrumb style={{ margin: '16px 0' }}>
            <Breadcrumb.Item><Link to='/'>{process.env.REACT_APP_SERVICESHOP_NAME || 'Home'}</Link></Breadcrumb.Item>
            <Breadcrumb.Item>Terminal</Breadcrumb.Item>
          </Breadcrumb>

          <div
            className='animate__animated animate__slideInUp animate_faster'
            style={{
              height: '100vh',
              zIndex: 30000
            }}
          >
            <Terminal
              hideTopBar
              allowTabs
              watchConsoleLogging
              startState='maximised'
              color='green'
              backgroundColor='black'
              barColor='black'
              style={{ fontWeight: 'bold', fontSize: '1.5em' }}
              commands={ORS.commands}
              descriptions={descriptions}
              msg='ORS Terminal'
            />
          </div>
        </Layout>
      </Layout>
    </Layout>
  )
}
