import React from 'react'
import { Card, Col, Row } from 'antd'
// import Editor from 'rich-markdown-editor'
import MarkdownIt from 'markdown-it'
import HTMLParser from 'html-react-parser'

const markdown = new MarkdownIt()

export default ({ orderData }) => {
  return (
    <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
      <Col className='gutter-row' xs={24} xl={24} style={{ marginBottom: '2em' }}>
        {
          orderData &&
            <>
              <h4>
                You are creating a new work order for {orderData.customer ? orderData.customer.profile.name.display : 'someone '}
                &nbsp;to repair {orderData.machines.length} {orderData.machines.length === 1 ? 'machine' : 'machines'}.
              </h4>

              <ol>
                {
                  orderData.machines.map(machine => {
                    return (
                      <li key={machine.uuid}>{machine.manufacturer} {machine.model} (Serial: {machine.serial})</li>
                    )
                  })
                }
              </ol>

              <Card title='Problem Description'>
                {/* <Editor
                  readOnly
                  defaultValue={orderData.description}
                /> */}

                <div>
                  {HTMLParser(markdown.render(orderData.description))}
                </div>
              </Card>
            </>
        }
      </Col>
    </Row>
  )
}
