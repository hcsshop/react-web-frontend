/* global Primus */

import feathers from '@feathersjs/client'

const client = feathers()

if (!window.Primus) {
  console.error('Primus is undefined; server must not be running')
} else {
  const socket = new Primus(process.env.REACT_APP_SERVICESHOP_PRIMUS_URL || 'http://localhost:3030')
  client.configure(feathers.primus(socket))
}

client.configure(feathers.authentication())

window.feathersClient = client
export default client
