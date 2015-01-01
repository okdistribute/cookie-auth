var memdb = require('memdb')
var debug = require('debug')('auth')
var cookie = require('./cookie.js')

module.exports = Auth

function Auth(opts) {
  var self = this
  if (!(this instanceof Auth)) return new Auth(opts)
  if (!opts) opts = {}
  this.cookie = cookie(opts)
  this.sessions = opts.sessions || memdb()
  this.authenticator = opts.authenticator
  if (!this.authenticator) throw new Error('must specify an authenticator')
}

Auth.prototype.handle = function(req, res, cb) {
  var self = this
  var sessionKey = this.cookie.get(req)
  
  // user is already logged in
  this.sessions.get(sessionKey, function(err, createdAt) {
    if (createdAt) {
      var data = {session: sessionKey, created: createdAt}
      debug('session OK', data)
      return cb(null, data)
    }
    
    self.authenticator(req, res, function(err) {
      // user is not authorized
      if (err) {
        debug('not authorized', err)
        self.sessions.del(sessionKey, function(delErr) {
          cb(err)
        })
        return
      }

      // authenticate user
      self.login(res, cb)
    })
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
  this.delete(req, logout) // ignore err
  function logout() {
    res.statusCode = 401
    res.setHeader('content-type', 'application/json')
    self.cookie.destroy(res)
    res.end(JSON.stringify({error: "Unauthorized", loggedOut: true}) + '\n')
    if (cb) setImmediate(cb)
  }
}
