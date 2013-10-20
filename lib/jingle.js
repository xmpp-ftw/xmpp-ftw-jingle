var builder    = require('ltx'),
    crypto     = require('crypto'),
    Base       = require('xmpp-ftw/lib/base')
    
var Jingle = function() {}

Jingle.prototype = new Base()

Jingle.prototype._events = {}

Jingle.prototype.handles = function(stanza) {
    return false
}

Jingle.prototype.handle = function(stanza) {
    return false
}

