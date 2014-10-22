cookie-auth
===========

This module does one thing very simply, and that's let your node process authenticate using cookies. Right now, it only handles one user as the master admin login. It could be easily extended to handle multiple users, though.

```npm install cookie-auth```


```javascript
var Auth = require('cookie-auth')

// set up server and router code...

auth = Auth({
  name: 'my-application',
  adminUser: 'admin',
  adminPass: 'admin'
})

router.addRoute('/login', function (req, res) {
  var self = this
  this.auth.handle(req, res, function(err, session) {
    if (err) return self.auth.error(req, res)
    self.json(res, {session: session})
  })
});

router.addRoute('/logout', function (req, res) {
  return this.auth.error(req, res)
});
```