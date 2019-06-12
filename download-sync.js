const AWS = require('aws-sdk')
const cp = require('child_process')
const config = require('./config')

const ddb = new AWS.DynamoDB({
  apiVersion: '2012-08-10'
})

async function syncS3 (sourceDir, toBucket, prefix) {
  const cmd = '/opt/aws'
  const args = [
    's3', 'sync', '--content-type', 'text/plain', '--exclude',
    '.git/*', '--acl', 'public-read', '--quiet', '--delete',
    sourceDir + '/', 's3://' + toBucket + '/' + prefix
  ]

  console.log('s3Sync command', cmd, args)

  const result = cp.execSync(`${cmd} ${args.join(' ')}`)

  return result
}

async function mktemp () {
  const command = 'mktemp -d /tmp/archive-XXXXX'
  const result = cp.execSync(command)
  return result.toString().trim()
}

async function download (uri, filename) {
  const command = `curl '${uri}' -L -s -o ${filename}`
  const result = cp.execSync(command)

  return result
}

async function extract (filename, extractpath) {
  const command = `unzip ${filename} -d ${extractpath}`
  return cp.execSync(command)
}

async function extractRootDir (filename) {
  const command = `unzip -qql ${filename} | head -n1 | tr -s ' ' | cut -d' ' -f5-`
  return cp.execSync(command).toString().trim()
}

async function setVersionStatus (moduleId, version, status) {
  // Save new version item status
  return ddb.updateItem({
    TableName: 'versions',
    Key: {
      moduleId: { S: moduleId },
      ID: { S: version }
    },
    ExpressionAttributeNames: {
      '#s': 'status'
    },
    ExpressionAttributeValues: {
      ':s': { 'S': status },
      ':moduleId': { 'S': moduleId },
      ':version': { 'S': version }
    },
    UpdateExpression: 'SET #s = :s',
    ConditionExpression: 'moduleId = :moduleId AND ID = :version'
  }).promise()
}

exports.handler = async function (e, ctx) {
  let moduleId, version

  try {
    console.log('DOWNLOAD_AND_SYNC')
    console.log(e)

    const records = e['Records']
    const record = records[0]

    const attributes = record['messageAttributes']

    const destinationPath = attributes['destination_path']['stringValue']
    console.log('destination_path: ' + destinationPath)

    const archiveUrl = attributes['archive_url']['stringValue']
    console.log('archive_url: ' + archiveUrl)

    moduleId = attributes['module_id']['stringValue']
    console.log('moduleId: ' + moduleId)

    version = attributes['version']['stringValue']
    console.log('version: ' + version)

    const type = attributes['type']['stringValue']
    console.log('type: ' + type)

    console.log('Making tmp dir')
    const tmpdir = await mktemp()
    console.log('Made tmp dir', tmpdir)

    console.log('Downloading archive from', archiveUrl)
    const zippath = `${tmpdir}/${version}.zip`
    await download(archiveUrl, zippath)
    console.log('Downloaded archive', archiveUrl, zippath)

    console.log('Extracting archive', zippath)
    await extract(zippath, tmpdir)
    const extractpath = await extractRootDir(zippath)
    console.log('Extracted archive', extractpath)

    const syncpath = `${tmpdir}/${extractpath}`

    console.log('Syncing module', syncpath)
    await syncS3(syncpath, config.bucketName, destinationPath)
    console.log('Sync complete')

    await setVersionStatus(moduleId, version, 'ready')
  } catch (err) {
    console.error(`DOWNLOAD_AND_SYNC ERROR: ${err}`)

    if (moduleId && version) {
      try {
        await setVersionStatus(moduleId, version, 'failed')
      } catch (err) {
        console.error(`DOWNLOAD_AND_SYNC ERROR: ${err}`)
      }
    }
  }
}

// Test
// exports.handler({
//   'Records': [
//     {
//       'messageId': '19dd0b57-b21e-4ac1-bd88-01bbb068cb78',
//       'receiptHandle': 'MessageReceiptHandle',
//       'body': 'Hello from SQS!',
//       'attributes': {
//       },
//       'messageAttributes': {
//         'type': { stringValue: 'webhook' },
//         'version': { stringValue: 'v0.2.6' },
//         'module_id': { stringValue: 'denoland/deno_std' },
//         'archive_url': { stringValue: 'https://github.com/denoland/deno_std/archive/v0.2.6.zip' },
//         'destination_path': { stringValue: 'deno_std/v0.2.6' }
//       },
//       'md5OfBody': '7b270e59b47ff90a553787216d55d91d',
//       'eventSource': 'aws:sqs',
//       'eventSourceARN': 'arn:aws:sqs:eu-west-2:123456789012:MyQueue',
//       'awsRegion': 'eu-west-2'
//     }
//   ]
// })

// | head -n 3  | tail -n 1 | tr -s ' ' | cut  -d' ' -f 3 | cut -d '/' -f 4
