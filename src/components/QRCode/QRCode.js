import React from 'react'
import QRCode from 'react-qr-code'
import { notification } from 'antd'

export const generateQRCode = ({ value, size = 256, fgColor = '#224e87' }) => <QRCode value={value} fgColor={fgColor} size={size} />

export const showQRCode = ({ uuid, type = '~', title = '', size = 256, fgColor = '#224e87' }) => {
  if (!uuid) throw new Error('You should at least pass the UUID to showQRCode')

  notification.open({
    duration: null,
    message: title,
    description: <div className='text-center'><QRCode value={`${type}:${uuid}`} fgColor={fgColor} size={size} /></div>
  })
}
