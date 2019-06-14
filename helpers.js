const AWS = require('aws-sdk')
const config = require('./config')

const ddb = new AWS.DynamoDB({
  apiVersion: '2012-08-10'
})

const sqs = new AWS.SQS({
  apiVersion: '2012-11-05'
})

function reformat (ddbResultItem) {
  const item = {}

  for (let key in ddbResultItem) {
    const val = ddbResultItem[key]

    if ('S' in val) {
      item[key] = val['S']
    } else if ('N' in val) {
      item[key] = +val['N']
    }
  }

  return item
}

async function createModuleVersion (username, reponame, fullname, userId,
  moduleDescription, ref, versionDescription, event, archiveUrl) {
  const moduleItem = {
    username: { S: username },
    ID: { S: reponame },
    fullname: { S: fullname },
    createdBy: { S: userId },
    createdAt: { N: Date.now().toString() }
  }

  if (moduleDescription) {
    moduleItem.description = { S: moduleDescription }
  }

  // Put ddb module entry if it doesn't already exist
  let moduleResult
  try {
    moduleResult = await ddb.putItem({
      TableName: 'modules',
      Item: moduleItem,
      ConditionExpression: 'username <> :username AND ID <> :reponame',
      ExpressionAttributeValues: {
        ':username': { 'S': username },
        ':reponame': { 'S': reponame }
      }
    }).promise()
  } catch (err) {
    if (err.code !== 'ConditionalCheckFailedException') {
      throw err
    }
  }

  const versionItem = {
    ID: { S: ref },
    moduleId: { S: fullname },
    moduleName: { S: reponame },
    status: { S: 'pending' },
    version: { S: ref },
    createdBy: { S: userId },
    createdAt: { N: Date.now().toString() }
  }

  if (versionDescription) {
    versionItem.description = { S: versionDescription }
  }

  // if (changesetUrl) item.changesetUrl = { S: changesetUrl }

  // Save new version item - will throw if the module/version exists already
  const versionResult = await ddb.putItem({
    TableName: 'versions',
    Item: versionItem,
    ConditionExpression: 'moduleId <> :moduleId AND ID <> :version',
    ExpressionAttributeValues: {
      ':moduleId': { 'S': fullname },
      ':version': { 'S': ref }
    }
  }).promise()

  // Pop message onto the queue to download & sync the repo
  const queueResult = await sqs.sendMessage({
    MessageBody: event.body,
    QueueUrl: config.queueUrl,
    MessageAttributes: {
      'type': { DataType: 'String', StringValue: 'webhook' },
      'archive_url': { DataType: 'String', StringValue: archiveUrl },
      'module_id': { DataType: 'String', StringValue: fullname },
      'version': { DataType: 'String', StringValue: ref },
      'destination_path': { DataType: 'String', StringValue: `${fullname}/${ref}` }
    }
  }).promise()

  return { moduleResult, versionResult, queueResult }
}

module.exports = { reformat, createModuleVersion }
