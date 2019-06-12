const AWS = require('aws-sdk')
const responder = require('./responder')
const { reformat } = require('./helpers')

const ddb = new AWS.DynamoDB({
  apiVersion: '2012-08-10'
})

module.exports = {
  async get (event) {
    try {
      const { username, reponame } = event.pathParameters
      const moduleId = `${username}/${reponame}`

      // Query versions db items by partition key
      const result = await ddb.query({
        TableName: 'versions',
        KeyConditionExpression: 'moduleId = :moduleId',
        ExpressionAttributeValues: {
          ':moduleId': {
            S: moduleId
          }
        }
      }).promise()

      const versions = result.Items.map(reformat)

      return responder.success(versions)
    } catch (err) {
      return responder.fail(err)
    }
  }
}
