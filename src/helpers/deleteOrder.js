/* global localStorage */
import React from 'react'
import { Modal, message } from 'antd'

import client from '../feathers/client'

export const deleteOrder = ({ order, history }) => {
  Modal.confirm({
    title: 'Do you want to delete this order?',
    closable: true,

    content: (
      <>
        <h5 className='animate__animated animate__pulse animate__infinite'>This cannot be undone!</h5>
        <hr />
        <small>Order: {order.uuid}</small>
      </>
    ),

    async onOk () {
      try {
        console.log('Deleting', order.uuid)
        await client.service('orders').remove(order.uuid)
        localStorage.removeItem('orders')
        message.success('Order was deleted')
        if (history) history.replace('/orders')
      } catch (err) {
        console.error(err)
        message.error('An error occurred deleting this order')
      }
    }
  })
}
