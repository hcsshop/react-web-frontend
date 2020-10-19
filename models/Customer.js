
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')

module.exports = (mongoose) => {
  const Schema = mongoose.Schema({
    uuid: { type: String, index: true, unique: true, default: uuidv4 },
    email: { type: String, index: true },
    password: String,

    timestamps: {
      lastLogin: Date,
      lastService: Date,
      customerSince: { type: Date, default: Date.now }
    },

    socialAccounts: {
      google: {
        id: { type: Number },
        data: {}
      }
    },

    roles: [String],

    flags: {
      confirmed: { type: Boolean, default: false }
    },

    profile: {
      name: {
        first: String,
        middle: String,
        last: String,
        display: String
      },

      address: {
        billing: String,
        physical: String,
        physicalSameAsBilling: { type: Boolean, default: true }
      },

      company: {
        isCompany: { type: Boolean, default: false },
        name: String,
        taxId: String,
        taxExempt: Boolean,
        contact: String,
        email: String,
        website: String
      },

      phone: {
        primary: {
          number: String,
          extension: String
        },

        mobile: {
          number: String,
          carrier: String
        },

        fax: {
          number: String,
          extension: String
        }
      },

      photo: Buffer,
      data: {}
    },

    notes: String,
    attachments: [{
      name: String,
      time: { type: Date, default: Date.now },
      url: String,
      data: Buffer
    }],

    quickbooksID: { type: String, unique: true },
    quickbooksData: String,

    tokens: {
      resetPassword: { type: String, default: null }
    },

    settings: {},
    clientSettings: {},
    serverSettings: {}
  }, { timestamps: true })

  Schema.methods.validPassword = function (password) {
    return bcrypt.compareSync(password, this.password)
  }

  Schema.methods.generateResetPasswordToken = function () {
    this.tokens.resetPassword = uuidv4()
    this.save()
    return this.tokens.resetPassword
  }

  Schema.methods.resetPassword = function (resetPasswordToken, newPassword) {
    if (!this.tokens.resetPassword) return false
    if (resetPasswordToken === this.tokens.resetPassword) {
      this.tokens.resetPassword = null
      this.password = this.constructor.hashPassword(newPassword)
      this.save()
      return true
    }
  }

  Schema.statics.hashPassword = function (password) {
    return bcrypt.hashSync(password)
  }

  return mongoose.model(`${process.env.REACT_APP_SERVICESHOP_COLLECTION_PREFIX || ''}Customer`, Schema)
}
