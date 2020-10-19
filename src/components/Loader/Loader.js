import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { LoadingOutlined } from '@ant-design/icons'

const LoadingScreen = props => {
  return (
    <div id='loading-screen'>
      <div className='loading-screen-outer'>
        <div className='loading-screen-middle'>
          <div className='loading-screen-inner'>
            <LoadingOutlined className='loader-icon' />
            <p className='loader-text'>{props.text}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const Loader = ({ text, children, effect }) => {
  const [loading, setLoading] = useState(true)
  // effect = typeof effect === 'function' ? effect : () => {
  //   setTimeout(() => {
  //     setLoading(false)
  //   }, 300)
  // }

  useEffect(() => { if (effect) effect(loading, setLoading) }, [effect, loading])

  return (
    <div>
      {
        loading
          ? (
            <>
              <LoadingScreen text={text} />
            </>
          )
          : children
      }
    </div>
  )
}

LoadingScreen.propTypes = {
  text: PropTypes.string
}

Loader.propTypes = {
  text: PropTypes.string,
  children: PropTypes.element,
  effect: PropTypes.func
}

export default Loader
