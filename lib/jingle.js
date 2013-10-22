var builder    = require('ltx'),
    Base       = require('xmpp-ftw/lib/base')
    
var Jingle = function() {}

Jingle.prototype = new Base()

Jingle.prototype._events = {
    'xmpp.jingle.initiate': 'initiate',
    'xmpp.jingle.info': 'info'
}

Jingle.prototype.NS             = 'urn:xmpp:jingle:1'
Jingle.prototype.NS_ERROR       = 'urn:xmpp:jingle:errors:1'
Jingle.prototype.NS_ESTOS       = 'http://estos.de/ns/ssrc'
Jingle.prototype.NS_RTP         = 'urn:xmpp:jingle:apps:rtp:1'
Jingle.prototype.NS_TRANSPORT   = 'urn:xmpp:jingle:transports:ice-udp:1'
Jingle.prototype.NS_DESCRIPTION = 'urn:xmpp:jingle:apps:stub:0'
Jingle.prototype.NS_DTLS        = 'urn:xmpp:tmp:jingle:apps:dtls:0'

Jingle.prototype.candidateAttributes = [ 'foundation', 'component',
    'protocol', 'priority', 'ip', 'port', 'type', 'generation',
    'network', 'id' ]
Jingle.prototype.payloadAttributes = [ 'id', 'name', 'clockrate',
                                       'channels' ]

Jingle.prototype.handles = function(stanza) {
    return !!(stanza.is('iq') &&
        stanza.getChild('jingle', this.NS))
}

Jingle.prototype.handle = function(stanza) {
    var jingle = stanza.getChild('jingle')
    switch (jingle.attrs.action) {
        case 'transport-info':
        case 'session-initiate':
        case 'session-accept':
            this._handleInfo(
                jingle, stanza.attrs.from, jingle.attrs
            )
            return true
    }
    return false
}

Jingle.prototype._handleInfo = function(stanza, from, jingle) {
    var data = {
        from: from,
        type: 'set',
        sid: jingle.sid,
        action: jingle.action,
        jingle: {}
    }
    this._parseContents(stanza.getChildren('content'), data.jingle)
    this._parseGroupings(stanza.getChildren('group'), data.jingle)
    var event
    switch (jingle.action) {
        case 'transport-info':
            event = 'xmpp.jingle.info'
            break
        case 'session-accept':
            event = 'xmpp.jingle.accept'
            break
        default:
        case 'session-initiate':
            event = 'xmpp.jingle.initiate'
            break
    }
    this.socket.emit(event, data)
}

Jingle.prototype._parseGroupings = function(groups, data) {
    if (0 === groups.length) return
    data.groupings = []
    var self = this
    groups.forEach(function(group) {
        var g = {
            semantics: group.attrs.semantics,
            contents: self._parseGroupContents(group.getChildren('content'))
        }
        data.groupings.push(g)
    })
}

Jingle.prototype._parseGroupContents = function(contents) {
    var content = []
    contents.forEach(function(c) {
        content.push(c.attrs.name)
    })
    return content
}

Jingle.prototype._parseContents = function(contents, data) {
    if (0 === contents.length) return
    data.contents = []
    var self = this
    contents.forEach(function(content) {
        var c = { name: content.attrs.name, creator: content.attrs.creator }
        if (content.getChild('description'))
            self._parseDescription(content.getChild('description'), c)
        if (content.getChild('transport'))
            self._parseTransport(content.getChild('transport'), c)
        if (content.attrs.senders) c.senders = content.attrs.senders
        data.contents.push(c)
    })
}

Jingle.prototype._parseDescription = function(description, data) {
    data.description = {}
    switch (description.attrs.xmlns) {
        case this.NS_RTP:
            data.description.descType = 'rtp'
            break
    }
    data.description.media = description.attrs.media
    this._parsePayloads(description.getChildren('payload-type'), data.description)
    this._parseEncryption(description.getChild('encryption'), data.description)
    data.description.feedback = []
    this._parseHeaderExtensions(
        description.getChildren(data.description.descType + '-hdrext'),
        data.description
    )
    data.description.ssrc = description.attrs.ssrc
    if (description.getChild('rtcp-mux')) data.description.mux = true
    this._parseSsrc(description.getChildren('ssrc'), data.description)
}

Jingle.prototype._parseSsrc = function(ssrcs, data) {
    data.ssrcs = []
    ssrcs.forEach(function(ssrc) {
        data.ssrcs.push({
            cname: ssrc.attrs.cname,
            msid: ssrc.attrs.msid,
            mslabel: ssrc.attrs.mslabel,
            ssrc: ssrc.attrs.ssrc,
            label: ssrc.attrs.label
        })
    })
}

Jingle.prototype._parseHeaderExtensions = function(extensions, data) {
    if (0 === extensions.length) return
    data.headerExtensions = []
    extensions.forEach(function(extension) {
        data.headerExtensions.push({
           id: extension.attrs.id,
           senders: extension.attrs.senders,
           uri: extension.attrs.uri
        })
    })
}

Jingle.prototype._parseEncryption = function(encryptions, data) {
    if (!encryptions) return
    data.encryption = []
    encryptions.forEach(function(encryption) {
        data.encryption.push({
            tag: encryption.attrs.tag,
            cipherSuite: encryption.attrs['crypto-suite'],
            keyParams: encryption.attrs['key-params'],
            sessionParams: encryption.attrs['session-params']
        })
    })
}

Jingle.prototype._parsePayloads = function(payloads, data) {
    if (0 === payloads.length) return
    var self = this
    data.payloads = []
    payloads.forEach(function(payload) {
        var p = {}
        self.payloadAttributes.forEach(function(attr) {
            if (payload.attrs[attr]) p[attr] = payload.attrs[attr]
        })
        p.feedback = []
        self._parsePayloadParameters(payload.getChildren('parameter'), p)
        data.payloads.push(p)
    })
}

Jingle.prototype._parsePayloadParameters = function(parameters, data) {
    if (0 === parameters.length) return
    data.parameters = []
    parameters.forEach(function(parameter) {
        data.parameters.push({
            key: parameter.attrs.name, value: parameter.attrs.value
        })
    })
}

Jingle.prototype._parseTransport = function(transport, data) {
    data.transport = {}
    switch (transport.attrs.xmlns) {
        case this.NS_TRANSPORT:
            data.transport.transType = 'iceUdp'
            break
    }
    this._parseCandidates(transport.getChildren('candidate'), data.transport)
    this._parseFingerprints(transport.getChildren('fingerprint'), data.transport)
    if (transport.attrs.ufrag) data.transport.ufrag = transport.attrs.ufrag
    if (transport.attrs.pwd) data.transport.pwd = transport.attrs.pwd
}

Jingle.prototype._parseFingerprints = function(fingerprints, data) {
    if (0 === fingerprints.length) return
    data.fingerprints = []
    fingerprints.forEach(function(fingerprint) {
        data.fingerprints.push({
            hash: fingerprint.attrs.hash,
            value: fingerprint.getText().trim()
        })
    })
}

Jingle.prototype._parseCandidates = function(candidates, data) {
    data.candidates = []
    if (0 === candidates.length) return
    var self = this
    candidates.forEach(function(candidate) {
        var entry = {}
        self.candidateAttributes.forEach(function(attr) {
            if (candidate.attrs[attr])
                entry[attr] = candidate.attrs[attr]
        })
        data.candidates.push(entry)
    })
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

Jingle.prototype.info = function(data, callback) {
    var self = this
    if (typeof callback !== 'function')
      return this._clientError('Missing callback', data)
    if (!data.to)
      return this._clientError('Missing \'to\' key', data, callback)
    if (!data.jingle)
      return this._clientError('Missing \'jingle\' key', data, callback)
    if (!data.jingle.sid)
      return this._clientError('Missing \'sid\' key', data, callback)
      
    var stanza = this._getStanza(data, 'set', 'transport-info')
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
            payloadElement.c(
                'parameter',
                { name: parameter.key, value: parameter.value }
            )
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
        var attrs = {
            xmlns: header.uri,
            id: header.id,
            senders: header.senders
        }
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
    if (data.candidates && Array.isArray(data.candidates))
        this._addCandidates(transport, data.candidates)
}

Jingle.prototype._addFingerprints = function(stanza, data) {
    var self = this
    data.forEach(function(fingerprint) {
        stanza
            .c('fingerprint', { xmlns: self.NS_DTLS, hash: fingerprint.hash })
            .t(fingerprint.value)
    })
}

Jingle.prototype._addCandidates = function(stanza, data) {
    var self = this
    data.forEach(function(candidate) {
        var attrs = {}
        self.candidateAttributes.forEach(function(attribute) {
            if (candidate[attribute]) attrs[attribute] = candidate[attribute]
        })
        stanza.c('candidate', attrs)
    })
}

module.exports = Jingle