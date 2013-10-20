var builder    = require('ltx'),
    crypto     = require('crypto'),
    Base       = require('xmpp-ftw/lib/base')
    
var Jingle = function() {}

Jingle.prototype = new Base()

Jingle.prototype._events = {
    'xmpp.jingle.initialise': 'initialise'
}

Jingle.prototype.NS       = 'urn:xmpp:jingle:1'
Jingle.prototype.NS_ERROR = 'urn:xmpp:jingle:errors:1'

Jingle.prototype.handles = function(stanza) {
    return false
}

Jingle.prototype.handle = function(stanza) {
    return false
}

Jingle.prototype.initialise = function(data, callback) {
  if (typeof callback !== 'function')
    return this._clientError('Missing callback', data)
  if (!data.to)
    return this._clientError('Missing \'to\' key', data, callback)
}

module.exports = Jingle
