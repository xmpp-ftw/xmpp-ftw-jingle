var builder    = require('ltx'),
    crypto     = require('crypto'),
    Base       = require('xmpp-ftw/lib/base')
    
var Jingle = function() {}

Jingle.prototype = new Base()

Jingle.prototype._events = {
    'xmpp.jingle.initiate': 'initiate'
}

Jingle.prototype.NS       = 'urn:xmpp:jingle:1'
Jingle.prototype.NS_ERROR = 'urn:xmpp:jingle:errors:1'
Jingle.prototype.NS_ESTOS = 'http://estos.de/ns/ssrc'
Jingle.prototype.NS_RTP   = 'urn:xmpp:jingle:apps:rtp:1'

Jingle.prototype.NS_DESCRIPTION = 'urn:xmpp:jingle:apps:stub:0'

Jingle.prototype.handles = function(stanza) {
    return false
}

Jingle.prototype.handle = function(stanza) {
    return false
}

Jingle.prototype.initiate = function(data, callback) {
    if (typeof callback !== 'function')
      return this._clientError('Missing callback', data)
    if (!data.to)
      return this._clientError('Missing \'to\' key', data, callback)
    if (!data.jingle)
      return this._clientError('Missing \'jingle\' key', data, callback)
    if (!data.jingle.sid)
      return this._clientError('Missing \'sid\' key', data, callback)
    var stanza = this._getStanza(data, 'set', 'session-initiate')
    stanza.attr('initiator', this.manager.getJidType('full'))
    
    if (data.jingle.contents) this._addContent(stanza, data.jingle.contents)

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
     ).c('jingle', { xmlns: this.NS, action: action, sid: data.jingle.sid })
     return stanza
}

Jingle.prototype._addContent = function(stanza, data) {
    var self = this
    data.forEach(function(content) {
        var c = stanza.c(
            'content',
            { name: content.name, senders: content.senders, creator: content.creator }
        )
        if (content.description) self._addDescription(c, content.description)
    })
}

Jingle.prototype._addDescription = function(stanza, data) {
    var element = stanza.c(
        'description',
        { xmlns: this.NS_RTP, ssrc: data.ssrc, media: data.media }
    )
    if (!data.payloads || !Array.isArray(data.payloads)) return
    data.payloads.forEach(function(payload) {
        var payloadElement = element.c('payload-type', { 
            name: payload.name,
            clockrate: payload.clockrate,
            id: payload.id,
            channels: payload.channels
        })
        if (!payload.parameters || !Array.isArray(payload.parameters)) return
        payload.parameters.forEach(function(parameter) {
            payloadElement.c('parameter', { name: parameter.key, value: parameter.value })
        })
    })
    if (data.encryption && Array.isArray(data.encryption))
         this._addEncryption(element, data.encryption)
}

Jingle.prototype._addEncryption = function(stanza, data) {
    var encryption = stanza.c('encryption')
    data.forEach(function(d) {
        var attrs = {}
        if (d.keyParams && (0 !== d.keyParams.length))
            attrs['key-params'] = d.keyParams
        if (d.cipherSuite && (0 !== d.cipherSuite.length))
            attrs['crypto-suite'] = d.cipherSuite
        if (d.sessionParams && (0 !== d.sessionParams.length))
            attrs['session-params'] = d.sessionParams
        if (d.tag && (0 !== d.tag.length))
            attrs.tag = d.tag
        encryption.c('crypto', attrs)
    })   
}

module.exports = Jingle