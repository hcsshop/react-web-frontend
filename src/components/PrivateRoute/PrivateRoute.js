import React, { useContext } from 'react'
import PropTypes from 'prop-types'
import { Route, Redirect } from 'react-router-dom'

import { store } from '../../store'

const PrivateRoute = ({ children, ...rest }) => {
  const Store = useContext(store)
  const { state } = Store

  return (
    <Route
      {...rest}
      render={({ location }) => (
        state.authorized ? children : <Redirect to={{ pathname: '/login', state: { from: location } }} />
      )}
    />
  )
}

PrivateRoute.propTypes = {
  children: PropTypes.element.isRequired
}

export default PrivateRoute
