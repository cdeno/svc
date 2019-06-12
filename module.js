const AWS = require('aws-sdk')
const responder = require('./responder')
const { reformat } = require('./helpers')

const ddb = new AWS.DynamoDB({
  apiVersion: '2012-08-10'
})

module.exports = {
  async find (event) {
    try {
      // Find module db items by secondary keys
      const moduleItemResults = await ddb.scan({
        TableName: 'modules',
        Limit: 100
      }).promise()

      const modules = moduleItemResults.Items.map(reformat)

      return responder.success(modules)
    } catch (err) {
      return responder.fail(err)
    }
  },

  async get (event) {
    try {
      const { username, reponame } = event.pathParameters

      // Get module db item by primary key
      const moduleItemResult = await ddb.getItem({
        TableName: 'modules',
        Key: {
          username: { S: username },
          ID: { S: reponame }
        }
      }).promise()

      const module = reformat(moduleItemResult.Item)

      return responder.success(module)
    } catch (err) {
      return responder.fail(err)
    }
  },

  async getByUser (event) {
    try {
      const { username } = event.pathParameters

      // Query module db items by partition key
      const result = await ddb.query({
        TableName: 'modules',
        KeyConditionExpression: 'username = :username',
        ExpressionAttributeValues: {
          ':username': {
            S: username
          }
        }
      }).promise()

      const modules = result.Items.map(reformat)

      return responder.success(modules)
    } catch (err) {
      return responder.fail(err)
    }
  }
}
