/* global localStorage */

import React, { createContext, useReducer } from 'react'
import PropTypes from 'prop-types'

const initialState = {
  authorized: false,
  token: null,
  user: { uuid: null, username: null, email: null, roles: null, profile: null }
}

const store = createContext(initialState)
const { Provider } = store

const updateStorage = (newState) => {
  localStorage.setItem('state', JSON.stringify(newState))
}

const StateProvider = ({ children }) => {
  const [state, dispatch] = useReducer((state, action) => {
    const { type, payload } = action
    let newState

    switch (type) {
      case 'update':
        newState = {
          ...state,
          ...payload
        }

        updateStorage(newState)
        return newState
      default:
        throw new Error()
    };
  }, initialState)

  return <Provider value={{ state, dispatch }}>{children}</Provider>
}

StateProvider.propTypes = {
  children: PropTypes.element.isRequired
}

export { store, StateProvider }
