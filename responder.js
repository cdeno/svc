module.exports = {
  success (data) {
    return {
      statusCode: 200,
      body: JSON.stringify(data),
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    }
  },

  fail (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err ? err.message : 'Unknown error'
      }),
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    }
  }
}
