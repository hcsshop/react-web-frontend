import client from '../../feathers/client'

export default async options => {
  const { order } = options

  let logoURL

  try {
    logoURL = (await client.service('settings').get('order.worksheet.logoURL')).text
    console.log({ logoURL })
  } catch (err) {
    console.warn(err)
  }

  const Document = {}

  Document.images = {
    logo: logoURL
  }

  Document.styles = {
    header: {
      fontSize: 32
    }
  }

  Document.header = []
  // if (logoURL) Document.header.push({ image: 'logo', fit: [200, 200] })

  // Document.header.push({ qr: `O:${order.uuid}` })

  Document.content = [
    {
      alignment: 'justify',
      columns: [
        logoURL && { image: 'logo', fit: [200, 200] },
        { text: `Order ${order.uuid.split('-')[0].toUpperCase()}\n\n\n`, alignment: 'right' }
      ]
    },

    { qr: `O:${order.uuid}`, fit: 100, alignment: 'right' }
  ]

  Document.footer = 'FOOTER'

  return Document
}
