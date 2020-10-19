import React from 'react'
import { useHistory } from 'react-router-dom'

export default (props) => {
  const { to } = props
  console.log('Router link!', to)
}
