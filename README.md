cookie-auth
===========

This module does one thing very simply, and that's let your node process authenticate using cookies. Great for CLI/REST clients.

## installation

```
npm install cookie-auth
```

## usage

### `var auth = require('cookie-auth')(opts)`

`opts` properties:

- `authenticator` - **required** - the authentication handler (see below)
- `name` - the name of the session token key in the cookies (defaults to `session`)
- `sessions` - a levelup instance to store sessions in. defaults to [`memdb`](http://npmjs.org/memdb). note that expiry/ttl is not handled by default

You **must** pass in your own 'authenticator' function that looks like this:

```javascript
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
