/* global localStorage */

import React, { useContext, useState, useEffect } from 'react'
import { Modal, Dropdown, Menu } from 'antd'
import { Navbar, Nav } from 'react-bootstrap'
import { Link, useLocation, useHistory } from 'react-router-dom'
// import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'
import QrReader from 'react-qr-reader'
import useSound from 'use-sound'
import CryptoJS, { AES as aes } from 'crypto-js'

import {
  AuditOutlined, CodeOutlined, DashboardOutlined, HourglassOutlined, ShopOutlined, TeamOutlined, MoreOutlined,
  ToolOutlined, SettingOutlined, CalendarOutlined, UserOutlined, LogoutOutlined, QrcodeOutlined
} from '@ant-design/icons'

import { store } from '../../store'
import client from '../../feathers/client'

import navbarLogo from '../../assets/logos/icon-50x50.png'
import soundPing from '../../assets/sounds/ping.wav'
// import soundMaleScanning from '../../assets/sounds/male-scanning.mp3'
import soundUIChime from '../../assets/sounds/ui-chime1.mp3'

const TopNav = () => {
  const Store = useContext(store)
  const { state, dispatch } = Store

  const [decryptedPassword, setDecryptedPassword] = useState()
  const [showPasswordModal, setShowPasswordModal] = useState()
  const [pingQrInterval, setPingQrInterval] = useState()
  const [showQrScanner, setShowQrScanner] = useState(false)
  // const [speechListening, setSpeechListening] = useState()

  const location = useLocation()
  const history = useHistory()

  const [playScanning] = useSound(soundPing)
  const [playChime] = useSound(soundUIChime)

  // const { transcript, resetTranscript } = useSpeechRecognition()

  const openQRScanner = () => {
    setShowQrScanner(true)

    setPingQrInterval(
      setInterval(() => {
        playScanning()
      }, 2000)
    )

    setTimeout(() => {
      setShowQrScanner(false)
      clearInterval(pingQrInterval)
    }, 15000)
  }

  // const startSpeechListener = () => {
  //   setSpeechListening(true)
  //   SpeechRecognition.startListening()
  // }

  useEffect(() => {
    if (showQrScanner) playScanning()
    if (!showQrScanner) clearInterval(pingQrInterval)
  }, [showQrScanner, playScanning, pingQrInterval])

  // useEffect(() => {
  //   console.log({ transcript, support: SpeechRecognition.browserSupportsSpeechRecognition() })
  // }, [transcript])

  // TODO: Move this to its own component
  const handleQRScan = data => {
    if (!data) return
    const parts = data.split(':')
    if (!parts[1]) return
    console.log(parts)

    playChime()

    switch (parts[0]) {
      case 'C': // Load customer
        setShowQrScanner(false)
        history.push(`/customers/view/${parts[1]}`)
        break
      case 'O': // Load order
        setShowQrScanner(false)
        history.push(`/orders/view/${parts[1]}`)
        break
      case 'A': // Load appointment
        setShowQrScanner(false)
        history.push(`/appointments/view/${parts[1]}`)
        break
      case 'PASS': // Decrypt password
        setShowQrScanner(false)
        setDecryptedPassword(aes.decrypt(parts[1], process.env.REACT_APP_SYMMETRIC_KEY).toString(CryptoJS.enc.Utf8))
        setShowPasswordModal(true)
        setTimeout(() => { setDecryptedPassword('*decryption expired*') }, 300000)
        break
      default:
        setShowQrScanner(false)
    }
  }

  const logout = () => {
    dispatch({ type: 'update', payload: { authorized: false, token: null, user: null } })
    localStorage.removeItem('state')
    client.logout()
  }

  const userMenu = (
    <Menu>
      <Menu.Item onClick={logout} style={{ padding: '0.5em' }}>
        <LogoutOutlined style={{ marginRight: '0.5em', position: 'relative', top: '-3px' }} />
        Logout
      </Menu.Item>
    </Menu>
  )

  return (
    <>
      {
        showQrScanner &&
          <QrReader
            delay={300}
            onScan={handleQRScan}
            onError={err => console.error(err)}
            showViewFinder={false}
            // style={{ display: 'none' }}
          />
      }

      <Modal
        visible={showPasswordModal}
        title={<h3>Decrypted Password</h3>}
        className='decrypted-password-modal'
        onCancel={() => setShowPasswordModal(false)}
        onOk={() => setShowPasswordModal(false)}
      >
        <h1 className='text-center'>{decryptedPassword}</h1>
      </Modal>

      <Navbar bg='dark' variant='dark' expand='lg'>
        <Navbar.Brand
          onClick={() => history.push('/')}
          style={{ marginRight: '4.5em', fontSize: '2em', position: 'relative', left: '2.1em' }}
          className='animate__animated animate__pulse animate__infinite animate__slow'
        >
          <img alt='' className='navbar-brand-logo' src={navbarLogo} />
        </Navbar.Brand>

        <span onClick={openQRScanner} title='Open QR Scanner'>
          <QrcodeOutlined
            className={showQrScanner ? 'qr-activate-icon animate__animated animate__swing animate__infinite' : 'qr-activate-icon'}
          />
        </span>

        {/* {
          SpeechRecognition.browserSupportsSpeechRecognition() &&
            <span onClick={startSpeechListener} title='Say audio commands'>
              <AudioOutlined
                className={speechListening ? 'microphone-activate-icon animate__animated animate__swing animate__infinite' : 'microphone-activate-icon'}
              />
            </span>
        } */}

        <Navbar.Toggle aria-controls='basic-navbar-nav' />

        <Navbar.Collapse id='basic-navbar-nav'>
          <Nav className='mr-auto'>
            <Nav.Item className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
              <Link to='/' className='nav-link'>
                <DashboardOutlined style={{ fontSize: '1.5em', marginRight: '0.5em' }} />
                <span className='nav-link-text'>Dashboard</span>
              </Link>
            </Nav.Item>
            <span className='navbar-divider' />
            <Nav.Item className={`nav-link ${location.pathname === '/appointments' ? 'active' : ''}`}>
              <Link to='/appointments' className='nav-link'>
                <CalendarOutlined style={{ fontSize: '1.5em', marginRight: '0.5em' }} />
                <span className='nav-link-text'>Appointments</span>
              </Link>
            </Nav.Item>
            <span className='navbar-divider' />
            <Nav.Item className={`nav-link ${location.pathname === '/customers' ? 'active' : ''}`}>
              <Link to='/customers' className='nav-link'>
                <TeamOutlined style={{ fontSize: '1.5em', marginRight: '0.5em' }} />
                <span className='nav-link-text'>Customers</span>
              </Link>
            </Nav.Item>
            <span className='navbar-divider' />
            <Nav.Item className={`nav-link ${location.pathname === '/orders' ? 'active' : ''}`}>
              <Link to='/orders' className='nav-link'>
                <AuditOutlined style={{ fontSize: '1.5em', marginRight: '0.5em' }} />
                <span className='nav-link-text'>Orders</span>
              </Link>
            </Nav.Item>

            <span className='navbar-divider' />

            <Nav.Item className='nav-link'>
              <Dropdown
                overlay={
                  <>
                    <Menu>
                      <Menu.Item onClick={() => history.push('/inventory/services')} style={{ padding: '0.5em' }}>
                        <HourglassOutlined style={{ fontSize: '1.5em', marginRight: '0.5em' }} />
                        Services
                      </Menu.Item>
                    </Menu>

                    <Menu>
                      <Menu.Item onClick={() => history.push('/inventory/products')} style={{ padding: '0.5em' }}>
                        <ShopOutlined style={{ fontSize: '1.5em', marginRight: '0.5em' }} />
                        Products
                      </Menu.Item>
                    </Menu>

                    <Menu>
                      <Menu.Item onClick={() => history.push('/tools')} style={{ padding: '0.5em' }}>
                        <ToolOutlined style={{ fontSize: '1.5em', marginRight: '0.5em' }} />
                        Tools
                      </Menu.Item>
                    </Menu>

                    <Menu>
                      <Menu.Item onClick={() => history.push('/settings')} style={{ padding: '0.5em' }}>
                        <SettingOutlined style={{ fontSize: '1.5em', marginRight: '0.5em' }} />
                        Settings
                      </Menu.Item>
                    </Menu>

                    <Menu>
                      <Menu.Item onClick={() => history.push('/terminal')} style={{ padding: '0.5em' }}>
                        <CodeOutlined style={{ fontSize: '1.5em', marginRight: '0.5em' }} />
                        Terminal
                      </Menu.Item>
                    </Menu>
                  </>
                }
              >
                <div className='nav-link' style={{ cursor: 'pointer' }}>
                  <MoreOutlined style={{ fontSize: '1.5em', marginRight: '0.1em' }} />
                  <span className='nav-link-text'>More</span>
                </div>
              </Dropdown>
            </Nav.Item>
          </Nav>

          <Nav className='ml-auto'>
            <Nav.Item className='topnav-user-menu'>
              <Dropdown overlay={userMenu}>
                <span>
                  <UserOutlined style={{ marginRight: '0.5em', position: 'relative', top: '-3px' }} />
                  {state.user && state.user.profile && state.user.profile.name}
                </span>
              </Dropdown>
            </Nav.Item>
            {/* <Nav.Item>
              <Input type='search' placeholder='Search..' className='mr-sm-2' prefix={<SearchOutlined />}/>
            </Nav.Item> */}
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    </>
  )
}

export default TopNav
