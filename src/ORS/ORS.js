// This is a bit of an experiment for now..
import moment from 'moment'

import client from '../feathers/client'

export default {
  commands: {
    test: {
      options: [{ name: 'test', description: 'Terminal functionality test' }],
      method: (args, print, runCommand) => {
        const { _ } = args
        _ && _.length > 0 && print(_.join(','))
      }
    },

    ls: {
      options: [{ name: 'ls', description: 'List [customers,orders,appointments,settings] with optional search [query]' }],
      method: (args, print, runCommand) => {
        const { _ } = args
        if (!_ || _.length === 0) return 'You must specify the resource type (customers, orders, appointments, settings)'
        const type = _[0]
        const search = _[1]

        const go = async ({ type, search }) => {
          if (!['customers', 'orders', 'appointments', 'settings'].includes(type)) return 'Invalid resource type'
          const query = { $limit: -1 }

          if (search) {
            query.$or = [{ uuid: { $regex: search, $options: 'igm' } }]

            switch (type) {
              case 'customers':
                query.$or.push({ 'profile.name.display': { $regex: search, $options: 'igm' } })
                break
              case 'orders':
                query.$or.push({ description: { $regex: search, $options: 'igm' } })
                query.$or.push({ 'customerData.profile.name.display': { $regex: search, $options: 'igm' } })
                break
              case 'appointments':
                query.$or.push({ description: { $regex: search, $options: 'igm' } })
                query.$or.push({ 'customerData.profile.name.display': { $regex: search, $options: 'igm' } })
                break
              case 'settings':
                query.$or.push({ key: { $regex: search, $options: 'igm' } })
                break
              default:
                console.log('Invalid type')
            }
          }

          const results = await client.service(type).find({ query })
          results.forEach(result => {
            let outputHeading = result.uuid
            switch (type) {
              case 'customers':
                outputHeading = result.profile.name.display
                break
              case 'appointments':
                outputHeading = `${result.title} - ${moment(result.spacetime.start).format('YYYY-MM-DD HH:mm:ss')} - (${result.uuid})`
                break
              case 'settings':
                outputHeading = result.title ? `${result.title} - (${result.key})` : result.key
                break
              default:
                console.error('Invalid type')
            }

            console.log(outputHeading, result)
          })
        }

        go({ type, search })
      }
    }
  }
}
