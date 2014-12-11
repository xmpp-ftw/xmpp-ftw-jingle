xmpp-ftw-jingle
=================

A Jingle (XEP-0166) plugin for XMPP-FTW.

https://github.com/xmpp-ftw/xmpp-ftw.git

# More....

See the XMPP-FTW demo repository - https://github.com/xmpp-ftw/xmpp-ftw-demo

# Client usage

See https://github.com/legastero/jingle.js

```
var jingle = new JingleWebRTC()
var attachMediaStream = require('attachmediastream')

jingle.on('localStream', function (stream) {
    attachMediaStream(stream, document.getElementById('localVideo'), {
        mirror: true,
        muted: true
    })
})

jingle.on('send', function (data) {
     socket.emit('xmpp.jingle.connection', data)
})

jingle.on('peerStreamAdded', function (session) {
     attachMediaStream(session.stream, document.getElementById('remoteVideo'))
})

// Answering a call request.
jingle.on('incoming', function (session) {
     session.accept() // Or display an incoming call banner, etc
});

// Starting an A/V session.
jingle.startLocalMedia(null, function () {
    var sess = jingle.createMediaSession('peer@example.com/resouce')
    sess.start()
})
```

# Build status

[![Build Status](https://secure.travis-ci.org/xmpp-ftw/xmpp-ftw-jingle.png)](http://travis-ci.org/xmpp-ftw/xmpp-ftw-jingle)

# Install

```
npm i --save xmpp-ftw-jingle
```

# Test

```
npm test
```

