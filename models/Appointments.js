
const { v4: uuidv4 } = require('uuid')

module.exports = (mongoose) => {
  const Schema = mongoose.Schema({
    uuid: { type: String, index: true, unique: true, default: uuidv4 },
    status: { type: String, default: 'queued' },
    customer: { type: String, required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: false },
    notes: String
  }, { timestamps: true })

  return mongoose.model(`${process.env.REACT_APP_SERVICESHOP_COLLECTION_PREFIX || ''}Appointment`, Schema)
}
