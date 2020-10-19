/* global fetch */

const Google = class {
  constructor (options) {
    this.options = options || {}

    if (!this.options.apiKey) throw new Error('Missing Google API Key')

    this.client = async ({ url }) => {
      const result = await fetch(`${url}&key=${this.options.apiKey}`)
      console.log(result)
    }
  }
}

export default Google
