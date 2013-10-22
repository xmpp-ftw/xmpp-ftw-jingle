var builder    = require('ltx'),
    crypto     = require('crypto'),
    Base       = require('xmpp-ftw/lib/base')
    
var Jingle = function() {}

Jingle.prototype = new Base()

Jingle.prototype._events = {
    'xmpp.jingle.initiate': 'initiate'
}

Jingle.prototype.NS             = 'urn:xmpp:jingle:1'
Jingle.prototype.NS_ERROR       = 'urn:xmpp:jingle:errors:1'
Jingle.prototype.NS_ESTOS       = 'http://estos.de/ns/ssrc'
Jingle.prototype.NS_RTP         = 'urn:xmpp:jingle:apps:rtp:1'
Jingle.prototype.NS_TRANSPORT   = 'urn:xmpp:jingle:transports:ice-udp:1'
Jingle.prototype.NS_DESCRIPTION = 'urn:xmpp:jingle:apps:stub:0'
Jingle.prototype.NS_DTLS        = 'urn:xmpp:tmp:jingle:apps:dtls:0'

Jingle.prototype.handles = function(stanza) {
    return false
}

Jingle.prototype.handle = function(stanza) {
    return false
}

Jingle.prototype.initiate = function(data, callback) {
    var self = this
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
        callback(null, true)
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
        if (content.transport) self._addTransport(c, content.transport)
    })
}

Jingle.prototype._addDescription = function(stanza, data) {
    var element = stanza.c(
        'description',
        { xmlns: this.NS_RTP, ssrc: data.ssrc, media: data.media }
    )
    if (data.payloads && Array.isArray(data.payloads))
        this._addPayloads(element, data.payloads)
    if (data.encryption && Array.isArray(data.encryption))
         this._addEncryption(element, data.encryption)
    if (data.mux) element.c('rtcp-mux')
    if (data.ssrcs && Array.isArray(data.ssrcs))
        this._addSsrc(element, data.ssrcs)
    if (data.headerExtensions && Array.isArray(data.headerExtensions))
        this._addHeaderExtensions(element, data.headerExtensions, data.descType)
    
}

Jingle.prototype._addPayloads = function(stanza, data) {
     data.forEach(function(payload) {
        var payloadElement = stanza.c('payload-type', { 
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

Jingle.prototype._addSsrc = function(stanza, data) {
    var self = this
    data.forEach(function(d) {
        var attrs = { xmlns: self.NS_ESTOS }
        if (d.msid) attrs.msid = d.msid
        if (d.ssrc) attrs.ssrc = d.ssrc
        if (d.cname) attrs.cname = d.cname
        if (d.label) attrs.label = d.label
        if (d.mslabel) attrs.mslabel = d.mslabel
        stanza.c('ssrc', attrs)
    })
}

Jingle.prototype._addHeaderExtensions = function(stanza, data, type) {
    data.forEach(function(header) {
        var attrs = { xmlns: header.uri, id: header.id, senders: header.senders }
        stanza.c(type + '-hdrext', attrs)
    })
}

Jingle.prototype._addTransport = function(stanza, data) {
    var attrs = {}
    switch (data.transType) {
        case 'iceUdp':
            attrs.xmlns = this.NS_TRANSPORT
            break
    }
    if (data.pwd) attrs.pwd = data.pwd
    if (data.ufrag) attrs.ufrag = data.ufrag
    
    var transport = stanza.c('transport', attrs)
    if (data.fingerprints && Array.isArray(data.fingerprints))
        this._addFingerprints(transport, data.fingerprints)
}

Jingle.prototype._addFingerprints = function(stanza, data) {
    var self = this
    data.forEach(function(fingerprint) {
        stanza
            .c('fingerprint', { xmlns: self.NS_DTLS, hash: fingerprint.hash })
            .t(fingerprint.value)
    })
}

module.exports = Jingle