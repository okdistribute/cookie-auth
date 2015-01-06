var http = require('http')
var test = require('tape')
var Router = require('routes-router')
var Connections = require('connections')
var request = require('request')
var basic = require('basic')
var Auth = require('./')

test('constructor works with no args', function(t) {
  var auth = Auth()
  t.ok(auth, 'did not throw')
  t.end()
})

test('responds with Unauthorized when logged out', function(t) {
  testServer(function(cleanup) {
    request({url: 'http://localhost:9988/login', json: true}, function(err, resp, json) {
      if (err) t.ifErr(err, 'should not get error')
      t.equal(resp.statusCode, 401, 'got 401')
      t.equal(json.error, 'Unauthorized', 'Unauthorized')
      cleanup(t)
    })
  })
})

test('login with basic auth', function(t) {
  testServer(function(cleanup) {
    request({url: 'http://test:pass@localhost:9988/login', json: true}, function(err, resp, json) {
      if (err) t.ifErr(err, 'should not get error')
      t.equal(resp.statusCode, 200, 'got 200')
      t.ok(json.session, 'got session id')
      cleanup(t)
    })
  })
})

test('failed login with basic auth', function(t) {
  testServer(function(cleanup) {
    request({url: 'http://test:notpass@localhost:9988/login', json: true}, function(err, resp, json) {
      if (err) t.ifErr(err, 'should not get error')
      t.equal(resp.statusCode, 401, 'got 401')
      t.equal(json.error, 'Unauthorized', 'Unauthorized')
      cleanup(t)
    })
  })
})

test('login + then use session', function(t) {
  testServer(function(cleanup) {
    request({url: 'http://test:pass@localhost:9988/login', json: true}, function(err, resp, json) {
      if (err) t.ifErr(err, 'should not get error')
      t.equal(resp.statusCode, 200, 'got 200')
      t.ok(json.session, 'got session id')
      var setCookie = resp.headers[('Set-Cookie').toLowerCase()]
      t.ok(setCookie, 'got a set-cookie')
      var headers =  {cookie: setCookie}
      request({url: 'http://localhost:9988/login', headers: headers, json: true}, function(err2, resp2, json2) {
        if (err2) t.ifErr(err2, 'should not get error')
        t.equal(resp2.statusCode, 200, 'got 200')
        t.ok(json2.session, 'got session id')
        t.equals(json.session, json2.session)
        cleanup(t)
      })
    })
  })
})

test('login + logout', function(t) {
  testServer(function(cleanup) {
    request({url: 'http://test:pass@localhost:9988/login', json: true}, function(err, resp, json) {
      if (err) t.ifErr(err, 'should not get error')
      t.equal(resp.statusCode, 200, 'got 200')
      t.ok(json.session, 'got session id')
      var setCookie = resp.headers[('Set-Cookie').toLowerCase()]
      t.ok(setCookie, 'got a set-cookie')
      var headers =  {cookie: setCookie}
      request({url: 'http://localhost:9988/logout', headers: headers, json: true}, function(err2, resp2, json2) {
        if (err2) t.ifErr(err2, 'should not get error')
        t.equal(resp2.statusCode, 401, 'got 401')
        var setCookie2 = resp2.headers[('Set-Cookie').toLowerCase()]
        t.ok(setCookie2.toString().indexOf('session=;') > -1, 'should receive empty session in set-cookie')
        t.equal(json2.error, 'Unauthorized', 'Unauthorized')
        cleanup(t)
      })
    })
  })
})

function testServer(cb) {
  var router = Router()
  var server = http.createServer(router)
  var connections = Connections(server)
  
  var authenticator = basic(function (user, pass, callback) {
    if (user === 'test' && pass === 'pass') return callback(null)
    callback(new Error("Access Denied"))
  })
  
  var auth = Auth({
    authenticator: authenticator
  })

  router.addRoute('/login', function (req, res) {
    auth.handle(req, res, function(err, session) {
      if (err) return auth.logout(req, res)
      res.end(JSON.stringify(session))
    })
  });

  router.addRoute('/logout', function (req, res) {
    return auth.logout(req, res)
  })
  
  server.listen(9988, function(err) {
    if (err) throw err
    cb(cleanup)
  })
  
  function cleanup(t) {
    connections.destroy()
    server.close(function() {
      t.end()
    })
  }
}
