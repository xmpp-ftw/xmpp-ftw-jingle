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
    var stanza = this._getStanza(data, 'set', 'session-initiate')
    stanza.attr('initiator', this.manager.getJidType('full'))
    stanza.c('content', { creator: 'initiator', name: data.name })
    this.manager.trackId(stanza.root().attr('id'), function(stanza) {
        if ('error' == stanza.attrs.type)
            return callback(self._parseError(stanza))

    })
    this.client.send(stanza)
}

Jingle.prototype._getStanza = function(data, type, action) {
     var stanza = new builder.Element(
       'iq',
       { to: data.to, type: type, id: this._getId() }
     ).c('jingle', { xmlns: this.NS, action: action, sid: data.sessionId })
     return stanza
}

module.exports = Jingle
