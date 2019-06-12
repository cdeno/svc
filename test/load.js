const fs = require('fs')
const got = require('got')

async function getJSON (url) {
  const db = await got(url)
  return JSON.parse(db.body)
}

async function loadDb () {
  return getJSON('https://raw.githubusercontent.com/denoland/registry/master/src/database.json')
}

;(async function () {
  const db = await loadDb()
  const deno = []

  for (const key in db) {
    const mod = db[key]
    const repoUrl = mod.repo
    console.log(repoUrl)

    const parts = repoUrl.split('/')
    const username = parts[3]
    const reponame = parts[4]

    const repoApiUrl = `https://api.github.com/repos/${username}/${reponame}`
    const tagsApiUrl = `https://api.github.com/repos/${username}/${reponame}/tags`

    const repo = await getJSON(repoApiUrl)
    const tags = await getJSON(tagsApiUrl)

    deno.push({ repo, tags })
  }

  fs.writeFileSync(`${__dirname}/data.json`, JSON.stringify(deno, null, 2))
})()
