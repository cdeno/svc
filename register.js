const responder = require('./responder')
const { createModuleVersion } = require('./helpers')

module.exports = {
  async post (event) {
    try {
      const body = JSON.parse(event.body)
      const { url, description } = body
      const prefix = 'https://github.com/'
      const parts = url.replace(prefix, '').split('/')

      // https://github.com/cdeno/test/releases/tag/0.0.11
      // https://github.com/cdeno/test/archive/0.0.11.zip

      const username = parts[0]
      const reponame = parts[1]
      const ref = parts[4]
      const fullname = `${parts[0]}/${parts[1]}`
      const archiveUrl = `${prefix}${fullname}/archive/${ref}.zip`
      const userId = 'cdeno'

      const { moduleResult, versionResult, queueResult } = await createModuleVersion(username,
        reponame, fullname, userId, description, ref, description, event, archiveUrl)

      return responder.success({ moduleResult, versionResult, queueResult })
    } catch (err) {
      return responder.fail(err)
    }
  }
}
