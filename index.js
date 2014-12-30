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
  this.sessions.get(sessionKey, function(err, expireDate) {
    if (expireDate) {
      var data = {session: sessionKey, expires: expireDate}
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
      var newSession = self.cookie.create(res)
      var expires = new Date().toISOString()
      self.sessions.put(newSession, expires, function(err) {
        debug('new session', newSession)
        cb(err, {session: newSession, expires: expires})
      })
    })
  })
  
}

Auth.prototype.logout = function(req, res) {
  var self = this
  var session = this.cookie.get(req)
  if (session) {
    this.sessions.del(session, logout)
  } else {
    logout()
  }
  function logout() {
    res.statusCode = 401
    res.setHeader('content-type', 'application/json')
    self.cookie.destroy(res)
    res.end(JSON.stringify({error: "Unauthorized", loggedOut: true}) + '\n')
  }
}
