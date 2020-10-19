import React from 'react'
import { AutoComplete, Button, Col, Row } from 'antd'

export default ({ customers, customerProvided, customerData, onSearchCustomer, onSelectCustomer, resetCustomer }) => {
  return (
    <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
      <Col className='gutter-row' xs={24} xl={24} style={{ marginBottom: '2em' }}>
        {
          customers && !customerProvided &&
            <AutoComplete
              autoFocus
              defaultActiveFirstOption
              className='ant-input'
              placeholder='Search customers..'
              onChange={onSearchCustomer}
              onSelect={value => { onSelectCustomer(value) }}
              options={customers.map(c => ({ value: c.uuid, label: `${c.profile.name.display}${c.profile.company.isCompany ? ' » ' + c.profile.company.name : ''}` }))}
            />
        }

        {
          customerProvided &&
            <div>
              <h5>{customerData.profile.name.display}</h5>
              {resetCustomer && <small><em>Different customer? <Button type='link' onClick={resetCustomer}>Click here.</Button></em></small>}
            </div>
        }
      </Col>
    </Row>
  )
}
