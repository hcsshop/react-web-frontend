const path = require('path')
const jwt = require('jsonwebtoken')
const parseAddress = require('parse-address')
const { check, validationResult } = require('express-validator')
const Package = require('./package.json')

module.exports = class {
  constructor ({ router, logger, mongoose, options }) {
    this.options = typeof options === 'object' ? options : {}
    this.log = logger
    this.mongoose = mongoose
    this.package = Package
    this.router = router
    this.name = this.options.name || 'Service Shop'
    this.root = this.options.root || '/'
    this.static = this.options.static || path.join(__dirname, 'build')
    this.corsAllowedOrigins = this.options.corsAllowedOrigins || ['http://localhost:3000']

    this.models = {
      Customer: require('./models/Customer')(this.mongoose)
    }

    const decodeToken = (req, res, next) => {
      const token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null
      jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
        if (err) return next(err)
        if (payload.data.uuid) req.user = payload.data
        return next()
      })
    }

    // Handle client-side routing; everything not starting with /api will send React app
    this.router.use(/^\/(?!api).*/, (req, res, next) => {
      return res.sendFile(path.join(__dirname, 'build', 'index.html'))
    })

    // Setup the app's routes
    this.router.get('/api/whoami', decodeToken, this.whoami.bind(this))
    this.router.get('/api/google/client-id', this.getGoogleClientID.bind(this))
    this.router.post('/api/google/verify-token', this.verifyGoogleLoginToken.bind(this))

    this.router.get('/api/appointments', decodeToken, this.getAppointments.bind(this))
    this.router.get('/api/appointments/:uuid', decodeToken, this.getAppointment.bind(this))
    this.router.post('/api/appointment', decodeToken, this.newAppointment.bind(this))

    this.router.get('/api/customers', decodeToken, this.getCustomers.bind(this))
    this.router.get('/api/customer/:uuid', decodeToken, this.getCustomer.bind(this))
    this.router.post('/api/customer', decodeToken, [
      check('email').isEmail()
    ], this.newCustomer.bind(this))

    this.router.get('/api/quickbooks/customers/sync', decodeToken, this.syncQuickbooksCustomers.bind(this))
    this.router.get('/api/quickbooks/customers/sync/status/:jobID', decodeToken, this.getSyncJobStatus.bind(this))
  }

  whoami (req, res, next) {
    if (!req.user) return res.status(401).send('Unauthorized')
    this.router.appComms.once(`user:${req.user.uuid}`, user => {
      res.json(user)
    })

    this.router.appComms.emit('user:getByUUID', req.user.uuid)
  }

  getGoogleClientID (req, res, next) {
    res.send(process.env.GOOGLE_OAUTH_CLIENT_ID)
  }

  verifyGoogleLoginToken (req, res, next) {
    if (!req.body.googleToken) return res.status(401).send('Unauthorized')
    this.router.appComms.once(`user:token:google:${req.body.googleToken.substr(0, 16)}`, token => res.send(token))
    this.router.appComms.emit('user:loginWithGoogleToken', req.body.googleToken)
  }

  async newAppointment (req, res, next) {
    if (!req.user) return res.status(403).send('Unauthorized')
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const appointmentData = {
      customer: req.body.customer,
      start: Date(req.body.start),
      end: req.body.end ? req.body.end : Date(req.body.start),
      notes: req.body.notes
    }

    res.json({ appointmentData })
  }

  async newCustomer (req, res, next) {
    if (!req.user) return res.status(403).send('Unauthorized')
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const customerData = {
      email: req.body.email.trim(),
      roles: ['customer'],
      notes: req.body.notes,

      profile: {
        name: {
          first: req.body.firstName,
          middle: req.body.middleName,
          last: req.body.lastName
        },

        address: {
          billing: req.body.addressBilling,
          physical: req.body.addressPhysical,
          physicalSameAsBilling: req.body.addressPhysicalSameAsBilling
        }
      }
    }

    customerData.profile.company = {
      isCompany: req.body.isCompany || false,
      name: req.body.companyName || '',
      taxId: req.body.companyTaxId,
      taxExempt: req.body.companyTaxExempt,
      contact: req.body.companyContact,
      email: req.body.companyEmail,
      website: req.body.companyWebsite
    }

    customerData.profile.phone = {
      primary: {
        number: req.body.phonePrimary || '',
        extension: req.body.phonePrimaryExt
      },

      mobile: {
        number: req.body.phoneMobile || '',
        carrier: req.body.phoneMobileCarrier
      },

      fax: {
        number: req.body.phoneFax || '',
        extension: req.body.phoneFaxExt
      }
    }

    const customer = new this.models.Customer(customerData)
    let qbCustomer

    if (process.env.REACT_APP_SERVICESHOP_QUICKBOOKS_ENABLED === 'true') {
      this.log.debug('Preparing customer for insertion into Quickbooks')

      qbCustomer = {
        PrimaryEmailAddr: { Address: customer.email },
        DisplayName: `${customer.profile.name.first} ${customer.profile.name.middle} ${customer.profile.name.last}`,
        GivenName: customer.profile.name.first,
        MiddleName: customer.profile.name.middle,
        FamilyName: customer.profile.name.last
      }

      if (customer.profile.address.billing !== '') {
        const billData = parseAddress.parseLocation(customer.profile.address.billing)
        qbCustomer.BillAddr = { Line1: `${billData.number} ${billData.street} ${billData.type}` }
        if (billData.sec_unit_type) qbCustomer.BillAddr.Line2 = `${billData.sec_unit_type} ${billData.sec_unit_num}`
        qbCustomer.BillAddr.City = billData.city
        qbCustomer.BillAddr.CountrySubDivisionCode = billData.state
        qbCustomer.BillAddr.PostalCode = billData.zip
      }

      if (customer.profile.address.physicalSameAsBilling) {
        qbCustomer.ShipAddr = qbCustomer.BillAddr
      } else {
        if (customer.profile.address.physical !== '') {
          const shipData = parseAddress.parseLocation(customer.profile.address.physical)
          qbCustomer.ShipAddr = { Line1: `${shipData.number} ${shipData.street} ${shipData.type}` }
          if (shipData.sec_unit_type) qbCustomer.ShipAddr.Line2 = `${shipData.sec_unit_type} ${shipData.sec_unit_num}`
          qbCustomer.ShipAddr.City = shipData.city
          qbCustomer.ShipAddr.CountrySubDivisionCode = shipData.state
          qbCustomer.ShipAddr.PostalCode = shipData.zip
        }
      }

      if (customer.profile.phone && customer.profile.phone.primary) qbCustomer.PrimaryPhone = { FreeFormNumber: customer.profile.phone.primary.number }
      if (customer.profile.phone && customer.profile.phone.mobile) qbCustomer.Mobile = { FreeFormNumber: customer.profile.phone.mobile.number }
      if (customer.profile.phone && customer.profile.phone.fax) qbCustomer.Fax = { FreeFormNumber: customer.profile.phone.fax.number }

      qbCustomer.Notes = customer.notes
      if (customer.profile.company.isCompany) {
        qbCustomer.CompanyName = customer.profile.company.name
        qbCustomer.Taxable = !customer.profile.company.taxExempt
        if (customer.profile.company.taxId) qbCustomer.PrimaryTaxIdentifier = customer.profile.company.taxId
        if (customer.profile.company.website) qbCustomer.WebAddr = { URI: customer.profile.company.website }
      }

      this.router.appComms.once('qbo:result:create-customer', async ({ err, data }) => {
        if (err) return res.status(500).json({ error: 'Failed to create customer in Quickbooks', details: err })
        customer.quickbooksID = data.Id
        customer.quickbooksData = JSON.stringify(data)
        await customer.save()
        res.json({ customer })
      })

      this.router.appComms.emit('qbo:create:customer', qbCustomer)
    } else {
      await customer.save()
      res.json({ customer })
    }
  }

  async getCustomers (req, res, next) { // NOTE: This is plural
    try {
      const customers = await this.models.Customer.find({}).select('-__v -quickbooksData')
      return res.json({ customers })
    } catch (err) {
      return next(err)
    }
  }

  async getCustomer (req, res, next) { // NOTE: This is singular
    const { uuid } = req.params

    try {
      const customer = await this.models.Customer.findOne({ uuid })
      return res.json({ customer })
    } catch (err) {
      return next(err)
    }
  }

  async syncQuickbooksCustomers (req, res, next) {
    if (!this.syncJobs) this.syncJobs = {}
    const syncJobKey = (Math.random() * Date.now()).toString(36)

    this.router.appComms.once('qbo:result:customers', async customers => {
      try {
        let convertedCustomers = customers.map(customer => {
          const convertedCustomer = {
            email: customer.PrimaryEmailAddr ? customer.PrimaryEmailAddr.Address : null,
            notes: customer.Notes,
            quickbooksID: customer.Id,
            quickbooksData: JSON.stringify(customer),

            profile: {
              name: {
                first: customer.GivenName,
                middle: customer.MiddleName,
                last: customer.FamilyName,
                display: customer.DisplayName
              },

              address: {
                billing: customer.BillAddr ? `${customer.BillAddr.Line1}, ${customer.BillAddr.City}, ${customer.BillAddr.CountrySubDivisionCode}` : undefined,
                physical: customer.ShipAddr ? `${customer.ShipAddr.Line1}, ${customer.ShipAddr.City}, ${customer.ShipAddr.CountrySubDivisionCode}` : undefined
              },

              phone: {
                primary: { number: customer.PrimaryPhone ? customer.PrimaryPhone.FreeFormNumber : undefined },
                mobile: { number: customer.Mobile ? customer.Mobile.FreeFormNumber : undefined },
                fax: { number: customer.Fax ? customer.Fax.FreeFormNumber : undefined }
              }
            }
          }

          if (customer.CompanyName) {
            convertedCustomer.profile.company = {
              isCompany: true,
              name: customer.CompanyName,
              taxExempt: !customer.Taxable
            }
          }

          return convertedCustomer
        })

        // Remove duplicates
        convertedCustomers = convertedCustomers.filter((customer, index, arr) => arr.findIndex(c => c.quickbooksID === customer.quickbooksID) === index)

        const quickbooksIDs = convertedCustomers.map(customer => customer.quickbooksID)
        const matches = await this.models.Customer.find({ quickbooksID: { $in: quickbooksIDs } })

        matches.forEach(async match => {
          const customer = convertedCustomers.filter(c => c.quickbooksID === match.quickbooksID)[0]
          convertedCustomers = convertedCustomers.filter(c => c.quickbooksID !== match.quickbooksID)
          await this.models.Customer.updateOne({ quickbooksID: match.quickbooksID }, { $set: { ...customer } })
        })

        this.log.silly(`${convertedCustomers.length} converted customers left after filtering existing QB IDs`)

        this.models.Customer.insertMany(convertedCustomers, { upsert: true }).then(docs => {
          delete this.syncJobs[syncJobKey]
        })

        res.json({ jobID: syncJobKey })
      } catch (err) {
        res.status(500).send(err.toString())
      }
    })

    this.syncJobs[syncJobKey] = true
    this.router.appComms.emit('qbo:get:customers')
  }

  getSyncJobStatus (req, res) {
    const { jobID } = req.params
    res.json(this.syncJobs ? this.syncJobs[jobID] || false : false)
  }
}
