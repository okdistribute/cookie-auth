var memdb = require('memdb')
var debug = require('debug')('auth')
var cookie = require('./cookie.js')

module.exports = Auth

function deny(req, res, cb) {
  setImmediate(function() {
    cb(new Error('not authorized'))
  })
}

function Auth(opts) {
  var self = this
  if (!(this instanceof Auth)) return new Auth(opts)
  if (!opts) opts = {}
  this.cookie = cookie(opts)
  this.sessions = opts.sessions || memdb()
  this.authenticator = opts.authenticator || deny
}

Auth.prototype.handle = function(req, res, cb) {
  var self = this
  self.getSession(req, function(err, session) { // ignore errors
    if (session) return cb(null, session)
    self.authenticator(req, res, function(err) {
      // user is not authorized
      if (err) {
        debug('not authorized', err)
        if (!session) return setImmediate(function() { cb(err) })
        self.sessions.del(session.session, function(delErr) {
          cb(err)
        })
        return
      }

      // authenticate user
      self.login(res, cb)
    })
  })
}

Auth.prototype.getSession = function(req, cb) {
  var sessionKey = this.cookie.get(req)  
  this.sessions.get(sessionKey, function(err, createdAt) {
    if (err) return cb(err)
    var data = {session: sessionKey, created: createdAt}
    debug('session OK', data)
    return cb(null, data)
  })
}

Auth.prototype.login = function(res, cb) {
  var self = this
  var newSession = self.cookie.create(res)
  var created = new Date().toISOString()
  self.sessions.put(newSession, created, function(err) {
    debug('new session', newSession)
    cb(err, {session: newSession, created: created})
  })
}

Auth.prototype.delete = function(req, cb) {
  var session = this.cookie.get(req)
  if (session) {
    this.sessions.del(session, cb)
  } else {
    setImmediate(cb)
  }  
}


Auth.prototype.logout = function(req, res, cb) {
  var self = this
  this.delete(req, logout)
  function logout() { // ignore err
    res.statusCode = 401
    res.setHeader('content-type', 'application/json')
    self.cookie.destroy(res)
    res.end(JSON.stringify({error: "Unauthorized", loggedOut: true}) + '\n')
    if (cb) setImmediate(cb)
  }
}
