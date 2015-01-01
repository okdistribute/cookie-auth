cookie-auth
===========

[![Build Status](https://travis-ci.org/karissa/cookie-auth.svg?branch=master)](https://travis-ci.org/karissa/cookie-auth)
![dat](http://img.shields.io/badge/Development%20sponsored%20by-dat-green.svg?style=flat)

This module does one thing very simply, and that's let your node process authenticate using cookies. Great for CLI/REST clients.

## installation

```
npm install cookie-auth
```

## API

### `var auth = require('cookie-auth')(opts)`

`opts` properties:

- `authenticator` - **required** - the authentication handler (see below)
- `name` - the name of the session token key in the cookies (defaults to `session`)
- `sessions` - a levelup instance to store sessions in. defaults to [`memdb`](http://npmjs.org/memdb). note that expiry/ttl is not handled by default

You **must** pass in your own 'authenticator' function that looks like this:

```
function authenticator(req, res, cb) {
  // do auth with req, res and call cb when done
  
  doSomeAuthThing(req, res, function(err) {
    // e.g. if not authorized
    cb(err)
  
    // otherwise, if authorized
    cb()
  })
}
```

### `auth.login(res, cb)`

creates a new session and sets a cookie on `res`, and calls `cb` when done with `(err, data)` where `err` is any error from the session store `.put` and `data` is the session response data (see below).

### `auth.logout(req, res, cb)`

deletes the session from the session store and sets a set-cookie to delete the cookie on `res`. calls the optional `cb` when done with no arguments

### `auth.handle(req, res, cb)`

looks up the session for `req` and if it is already valid calls `cb`. If no session exists then the `authenticator` will be attempted. If authentication is successful then `auth.login` gets called with `cb`.

### response data

for valid sessions the following data is returned to the `cb` as the second argument (for both `login` and `handle`):

`{session: <session-id-string>, created: <created-at-ISO-8601-date-string>}`

e.g.

`{session: "b7c91436a316ef5b189467b9898d21e6", created: "2015-01-01T21:59:04.844Z"}`

in the case of an error `cb` will be called with the `Error` as the first argument.

## Usage

Here is an example of using the [`basic` module from npm](http://npmjs.org/basic) to do HTTP Basic Authentication:

```javascript
var Auth = require('cookie-auth')
var basic = require('basic')

// set up server and router code...

var basicAuthenticator = basic(function (user, pass, callback) {
  if (user === 'test' && pass === 'pass') return callback(null)
  callback(new Error("Access Denied"))
})
  
var auth = Auth({
  name: 'my-application',
  authenticator: basicAuthenticator
})

router.addRoute('/login', function (req, res) {
  var self = this
  auth.handle(req, res, function(err, session) {
    if (err) return auth.logout(req, res)
    res.end(JSON.stringify(session))
  })
});

router.addRoute('/logout', function (req, res) {
  return auth.logout(req, res)
})
```
