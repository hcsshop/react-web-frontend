/* global localStorage */
import React from 'react'
import { Modal, message } from 'antd'
import client from '../feathers/client'

export const deleteCustomer = async ({ customer, history, qbEnabled }) => {
  Modal.confirm({
    title: 'Do you want to delete this customer?',
    closable: true,

    content: (
      <>
        <h5 className='animate__animated animate__pulse animate__infinite'>This cannot be undone!</h5>
        {
          qbEnabled &&
            <>
              <hr />
              <h5>Note: For safety, the Quickbooks customer will not be modified.</h5>
              <h5>You must mark them Inactive from Quickbooks before you sync again, or they will be reimported.</h5>
            </>
        }
        <hr />
        <small>Customer: {customer.profile.name.display}<br /><em>{customer.uuid}</em></small>
      </>
    ),

    async onOk () {
      try {
        console.log('Deleting', customer.uuid)
        await client.service('customers').remove(customer.uuid)
        localStorage.removeItem('customers')
        message.success('Customer was deleted')
        history.replace('/customers')
      } catch (err) {
        console.error(err)
        message.error('An error occurred deleting this customer')
      }
    }
  })
}
