/* global localStorage */

import React, { useContext, useEffect, useState } from 'react'
import { Helmet } from 'react-helmet'
import { Modal, message } from 'antd'
import Particles from 'react-particles-js'
// import GoogleLogin from 'react-google-login'
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom'
import { NotFound } from '@feathersjs/errors'

import 'antd/dist/antd.min.css'
import 'bootstrap/dist/css/bootstrap.min.css'
// Yeah, I included Bootstrap mostly for the navbar. Wanna fight about it?

import { store } from './store'
import client from './feathers/client'

import Loader from './components/Loader/Loader'
import ScrollToTop from './components/ScrollToTop/ScrollToTop'
import PrivateRoute from './components/PrivateRoute/PrivateRoute'
import Login from './components/Login/Login'
import Home from './components/Home/Home'
import Appointments from './components/Appointments/Appointments'
import ViewAppointment from './components/Appointments/ViewAppointment'
import NewAppointment from './components/Appointments/NewAppointment'
import Customers from './components/Customers/Customers'
import ViewCustomer from './components/Customers/ViewCustomer'
import NewCustomer from './components/Customers/NewCustomer'
import EditCustomer from './components/Customers/EditCustomer'
import Orders from './components/Orders/Orders'
import ViewOrder from './components/Orders/ViewOrder'
import NewOrder from './components/Orders/NewOrder'
import Tools from './components/Tools/Tools'
import Settings from './components/Settings/Settings'
import Terminal from './components/Terminal/Terminal'

message.config({
  top: 100
})

const MapsJsUrl = process.env.REACT_APP_GOOGLE_API_KEY
  ? `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_API_KEY}&libraries=places`
  : null

let localStateLoaded = false

const App = props => {
  const Store = useContext(store)
  const { state, dispatch } = Store

  const [showParticles, setShowParticles] = useState(true)

  const redirectToIntuitAuthUrl = async () => {
    const authUrl = await client.service('intuit').find({ query: { id: 'authUrl' } })
    Modal.info({ title: 'Redirecting to Intuit for authentication' })
    window.location.href = authUrl
  }

  useEffect(() => {
    window.onError = err => {
      console.error('onError:', err)
    }

    window.onunhandledrejection = err => {
      switch (err.reason.name) {
        case 'NotAuthenticated':
          if (!state.authorized) return
          client.reAuthenticate()
          return window.location.reload()
        default:
          console.error(err)
          message.error('An unexpected error occurred. Try reloading.', 10)
          // setTimeout(() => window.location.reload(), 1000)
          throw err
      }
    }
  }, [state.authorized])

  useEffect(() => {
    const localState = localStorage.getItem('state')
    if (!localStateLoaded && localState) {
      console.log('Loading state from local storage')
      localStateLoaded = true
      dispatch({ type: 'update', payload: JSON.parse(localState) })
    }
  }, [dispatch])

  useEffect(() => {
    let logoutTimer

    const checkAuth = async () => {
      try {
        await client.reAuthenticate()
      } catch (err) {
        console.error(err.code, err.name, err.message)
        dispatch({ type: 'update', payload: { authorized: false, token: null, user: null, settings: null } })
      }
    }

    if (state.authorized && !logoutTimer) {
      logoutTimer = setInterval(checkAuth, state.logoutTimerInterval || 30000)
      checkAuth()
    }

    return () => {
      clearInterval(logoutTimer)
      logoutTimer = null
    }
  }, [state, dispatch])

  useEffect(() => {
    let runNumber = 0

    const run = async () => {
      if (!state.authorized) return false
      runNumber++

      try {
        const qbEnabled = await client.service('settings').get('quickbooks.enabled')
        if (qbEnabled.enabled) {
          const isActive = await client.service('intuit').get('isActive')
          if (!isActive) throw NotFound
          // Test connection to be sure
          const { CompanyInfo } = await client.service('intuit').get('company')
          // console.log(CompanyInfo)
          if (runNumber === 1) message.success(`Quickbooks connected to ${CompanyInfo.CompanyName}`, 1)
          if (runNumber > 20) runNumber = 2
        }
      } catch (err) {
        console.error(err)
        if (err.name === 'NotFound') {
          redirectToIntuitAuthUrl()
        } else if (err.name === 'NotAuthenticated') {
          client.logout()
          localStorage.removeItem('state')
        } else {
          console.error(err)
          message.error('Error checking Quickbooks link')
        }
      }
    }

    window.IntuitLinkCheckInterval = setInterval(run, 360000)
    run()
  }, [state.authorized])

  useEffect(() => {
    const go = async () => {
      try {
        const particles = await client.service('settings').get('particles.enabled')
        setShowParticles(particles.enabled)
      } catch (err) {
        console.warn(err)
      }
    }

    if (state.authorized) go()
  }, [state.authorized])

  const loaderEffect = (loading, setLoading) => {
    setTimeout(() => {
      setLoading(false)
    }, 300)
  }

  return (
    <>
      <Helmet>
        <title>{process.env.REACT_APP_SERVICESHOP_NAME || 'OpenRepairShop'}</title>
      </Helmet>

      {process.env.REACT_APP_SYSTEM_NOTICE && <div id="system-notice">{process.env.REACT_APP_SYSTEM_NOTICE}</div>}

      {
        showParticles &&
          <Particles
            canvasClassName='particles-canvas'
            params={{
              particles: {
                number: {
                  value: 75
                },
                size: {
                  value: 3
                }
              }
            }}
          />
      }

      <Loader effect={loaderEffect}>
        <Router>
          <ScrollToTop />
          <Switch>
            <Route exact path='/login'><Login /></Route>
            <PrivateRoute exact path='/'><Home /></PrivateRoute>
            <PrivateRoute exact path='/appointments'><Appointments /></PrivateRoute>
            <PrivateRoute exact path='/appointments/view/:uuid'>
              <>
                <Helmet script={[{ src: MapsJsUrl }]} />
                <ViewAppointment />
              </>
            </PrivateRoute>
            <PrivateRoute exact path='/appointments/new'>
              <>
                <Helmet script={[{ src: MapsJsUrl }]} />
                <NewAppointment />
              </>
            </PrivateRoute>

            <PrivateRoute exact path='/customers'><Customers /></PrivateRoute>
            <PrivateRoute exact path='/customers/view/:uuid'><ViewCustomer /></PrivateRoute>
            <PrivateRoute exact path='/customers/edit/:uuid'>
              <>
                <Helmet script={[{ src: MapsJsUrl }]} />
                <EditCustomer />
              </>
            </PrivateRoute>
            <PrivateRoute exact path='/customers/new'>
              <>
                <Helmet script={[{ src: MapsJsUrl }]} />
                <NewCustomer />
              </>
            </PrivateRoute>

            <PrivateRoute exact path='/orders'><Orders /></PrivateRoute>
            <PrivateRoute exact path='/orders/view/:uuid'><ViewOrder /></PrivateRoute>
            <PrivateRoute exact path='/orders/edit/:uuid'>
              <>
                <Helmet script={[{ src: MapsJsUrl }]} />
                {/* <EditOrder /> */}
              </>
            </PrivateRoute>
            <PrivateRoute exact path='/orders/new'><NewOrder /></PrivateRoute>

            <PrivateRoute exact path='/tools'><Tools /></PrivateRoute>
            <PrivateRoute exact path='/settings'><Settings /></PrivateRoute>
            <PrivateRoute exact path='/terminal'><Terminal /></PrivateRoute>
          </Switch>
        </Router>
      </Loader>
    </>
  )
}

export default App
