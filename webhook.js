const assert = require('assert')
const responder = require('./responder')
const { createModuleVersion } = require('./helpers')

module.exports = {
  async post (event) {
    try {
      const body = JSON.parse(event.body)
      const { ref_type: type, ref, repository, sender, description } = body

      assert.strictEqual(type, 'tag')

      const reponame = repository.name
      const moduleDescription = repository.description
      const archiveUrl = repository.archive_url
        .replace('{/ref}', '/' + ref)
        .replace('{archive_format}', 'zipball')

      const username = repository.owner.login
      const fullname = repository.full_name
      const userId = sender.login

      const { moduleResult, versionResult, queueResult } = await createModuleVersion(username,
        reponame, fullname, userId, moduleDescription, ref, description, event, archiveUrl)

      console.log('Webhook success', moduleResult, versionResult, queueResult)
      return responder.success({ moduleResult, versionResult, queueResult })
    } catch (err) {
      console.log(err)
      return responder.fail(err)
    }
  }
}
