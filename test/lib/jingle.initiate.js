var should = require('should')
  , Jingle = require('../../lib/jingle')
  , ltx    = require('ltx')
  , helper = require('../helper')

describe('Jingle', function() {

    var jingle, socket, xmpp, manager, request

    before(function() {
        request = require('../resources/initiate.json')
        socket = new helper.Eventer()
        xmpp = new helper.Eventer()
        manager = {
            socket: socket,
            client: xmpp,
            trackId: function(id, callback) {
                this.callback = callback
            },
            makeCallback: function(error, data) {
                this.callback(error, data)
            },
            fullJid: {
                domain: 'montague.lit',
                user: 'romeo',
                resource: 'laptop'
            },
            getJidType: function(type) {
                switch (type) {
                    case 'full':
                        return 'romeo@montague.lit/laptop'
                }
            }
        }
        jingle = new Jingle()
        jingle.init(manager)
    })

    describe('Initiate', function() {
      
        it('Errors if no callback provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            socket.once('xmpp.error.client', function(error) {
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Missing callback')
                error.request.should.eql({})
                xmpp.removeAllListeners('stanza')
                done()
            })
            socket.emit('xmpp.jingle.initiate', {})
        })
        
        it('Errors if non-functional callback provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            socket.once('xmpp.error.client', function(error) {
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Missing callback')
                error.request.should.eql({})
                xmpp.removeAllListeners('stanza')
                done()
            })
            socket.emit('xmpp.jingle.initiate', {}, true)
        })
            
        it('Errors if no \'to\' key provided', function(done) {
            var request = {}
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Missing \'to\' key')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.emit(
                'xmpp.jingle.initiate',
                request,
                callback
            )
        })

        it('Errors if there\'s no \'jingle\' key', function(done) {
            var request = { to: 'juliet@shakespeare.lit' }
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Missing \'jingle\' key')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.emit(
                'xmpp.jingle.initiate',
                request,
                callback
            )
        })

        it('Errors if there\'s no \'sid\' key', function(done) {
            var request = { to: 'juliet@shakespeare.lit', jingle: {} }
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Missing \'sid\' key')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.emit(
                'xmpp.jingle.initiate',
                request,
                callback
            )
        })

        it('Sends expected stanza', function(done) {
            var request = {
                to: 'juliet@shakespeare.lit/balcony',
                jingle: {
                  sid: '12345'
                }
            } 
            
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.id.should.exist
                stanza.attrs.to.should.equal(request.to) 
                stanza.attrs.type.should.equal('set')
                var element = stanza.getChild('jingle', jingle.NS)
                element.should.exist
                element.attrs.action.should.equal('session-initiate')
                element.attrs.sid.should.equal(request.jingle.sid)
                element.attrs.initiator.should.equal(
                   manager.fullJid.user + '@' + manager.fullJid.domain + '/' +
                   manager.fullJid.resource
                )
                done()
            })
            socket.emit('xmpp.jingle.initiate', request, function() {})
        })

        it('Sends expected stanza with contents', function(done) {

            xmpp.once('stanza', function(stanza) {
                var contents = stanza
                     .getChild('jingle', jingle.NS)
                     .getChildren('content')
                contents.length.should.equal(2)
                var content = contents[0]
                content.should.exist
                content.attrs.creator
                    .should.equal(request.jingle.contents[0].creator)
                content.attrs.name
                    .should.equal(request.jingle.contents[0].name)
                content.attrs.senders
                    .should.equal(request.jingle.contents[0].senders)
                
                content = contents[1]
                content.should.exist
                content.attrs.creator
                    .should.equal(request.jingle.contents[1].creator)
                content.attrs.name
                    .should.equal(request.jingle.contents[1].name)
                content.attrs.senders
                    .should.equal(request.jingle.contents[1].senders)
                done()
            })
            socket.emit('xmpp.jingle.initiate', request, function() {})
        })

        it('Sends expected stanza with description', function(done) {

            xmpp.once('stanza', function(stanza) {
                var description = stanza
                     .getChild('jingle', jingle.NS)
                     .getChildren('content')[0]
                    .getChild('description', jingle.NS_RTP)
                description.should.exist
                description.attrs.ssrc
                    .should.equal(request.jingle.contents[0].description.ssrc)
                description.attrs.media
                    .should.equal(request.jingle.contents[0].description.media)
                var payloads = description.getChildren('payload-type')
                payloads.length.should.equal(10)
                var payload = payloads[0]
                var requestPayload = request.jingle.contents[0].description.payloads[0]
                payload.attrs.channels.should.equal(requestPayload.channels)
                payload.attrs.clockrate.should.equal(requestPayload.clockrate)
                payload.attrs.name.should.equal(requestPayload.name)
                payload.attrs.id.should.equal(requestPayload.id)
                
                var parameters = payload.getChildren('parameter')
                parameters.length.should.equal(1)
                var parameter = parameters[0]
                parameter.attrs.name.should.equal(requestPayload.parameters[0].key)
                parameter.attrs.value.should.equal(requestPayload.parameters[0].value)

                done()
            })
            socket.emit('xmpp.jingle.initiate', request, function() {})
        })

        it('Sends expected stanza with payload description', function(done) {

            xmpp.once('stanza', function(stanza) {
                var payloads = stanza
                     .getChild('jingle', jingle.NS)
                     .getChildren('content')[0]
                    .getChild('description', jingle.NS_RTP)
                    .getChildren('payload-type')
                payloads.length.should.equal(10)
                var payload = payloads[0]
                var requestPayload = request.jingle.contents[0].description.payloads[0]
                payload.attrs.channels.should.equal(requestPayload.channels)
                payload.attrs.clockrate.should.equal(requestPayload.clockrate)
                payload.attrs.name.should.equal(requestPayload.name)
                payload.attrs.id.should.equal(requestPayload.id)
                
                var parameters = payload.getChildren('parameter')
                parameters.length.should.equal(1)
                var parameter = parameters[0]
                parameter.attrs.name.should.equal(requestPayload.parameters[0].key)
                parameter.attrs.value.should.equal(requestPayload.parameters[0].value)

                done()
            })
            socket.emit('xmpp.jingle.initiate', request, function() {})
        }) 
        
        it('Sends expected stanza with encryption description', function(done) {

            xmpp.once('stanza', function(stanza) {
                var encryptions = stanza
                     .getChild('jingle', jingle.NS)
                     .getChildren('content')[0]
                    .getChild('description', jingle.NS_RTP)
                    .getChild('encryption').getChildren('crypto')
                encryptions.length.should.equal(1)
                var encryption = encryptions[0]
                
                var encryptionRequest = request.jingle.contents[0]
                    .description
                    .encryption[0]
                encryption.attrs['key-params'].should.equal(encryptionRequest.keyParams)
                encryption.attrs['crypto-suite'].should.equal(encryptionRequest.cipherSuite)
                encryption.attrs.tag.should.equal(encryptionRequest.tag)
                should.not.exist(encryption.attrs['session-params'])
                done()
            })
            socket.emit('xmpp.jingle.initiate', request, function() {})
        })
        
        it('Sends expected stanza with misc description fields', function(done) {

            xmpp.once('stanza', function(stanza) {
                var description = stanza
                     .getChild('jingle', jingle.NS)
                     .getChildren('content')[0]
                    .getChild('description', jingle.NS_RTP)
                description.getChild('rtcp-mux').should.exist
                
                var miscRequest = request.jingle.contents[0].description
                
                var ssrcs = description.getChildren('ssrc')
                ssrcs.length.should.equal(1)
                var ssrc = ssrcs[0]
                ssrc.should.exist
                ssrc.attrs.xmlns.should.equal(jingle.NS_ESTOS)
                ssrc.attrs.msid.should.equal(miscRequest.ssrcs[0].msid)
                ssrc.attrs.ssrc.should.equal(miscRequest.ssrcs[0].ssrc)
                ssrc.attrs.label.should.equal(miscRequest.ssrcs[0].label)
                ssrc.attrs.mslabel.should.equal(miscRequest.ssrcs[0].mslabel)
                ssrc.attrs.cname.should.equal(miscRequest.ssrcs[0].cname)
                
                var headers = description.getChildren(miscRequest.descType + '-hdrext')
                headers.length.should.equal(1)
                var header = headers[0]
                header.attrs.xmlns
                    .should.equal(miscRequest.headerExtensions[0].uri)
                header.attrs.id
                    .should.equal(miscRequest.headerExtensions[0].id)
                header.attrs.senders
                    .should.equal(miscRequest.headerExtensions[0].senders)
                done()
            })
            socket.emit('xmpp.jingle.initiate', request, function() {})
        })        

        it('Sends expected stanza with transport', function(done) {

            xmpp.once('stanza', function(stanza) {
                var transport = stanza
                     .getChild('jingle', jingle.NS)
                     .getChildren('content')[0]
                     .getChild('transport', jingle.NS_TRANSPORT)
                var transportRequest = request.jingle.contents[0].transport
                
                transport.should.exist
                transport.attrs.pwd.should.equal(transportRequest.pwd)
                transport.attrs.ufrag.should.equal(transportRequest.ufrag)
                done()
            })
            socket.emit('xmpp.jingle.initiate', request, function() {})
        })
        
        /**
         "candidates": [],
                "fingerprints": [
                  {
                    "hash": "sha-256",
                    "value": "fingerprints-hash-value"
                  }
                ],
                "pwd": "pwd-value",
                "transType": "iceUdp",
                "ufrag": "ufrag-value"
        */
        
        /*
        <transport xmlns="urn:xmpp:jingle:transports:ice-udp:1" pwd="aVc0GOR0r6wE8yeUQoeCr1hS" ufrag="2BirJjwFmx7+STZg">
        <fingerprint xmlns="urn:xmpp:tmp:jingle:apps:dtls:0" hash="sha-1">EE:17:2D:2D:B6:55:5F:28:88:71:87:FD:FD:6F:1C:8D:E3:24:E5:C0</fingerprint>
      </transport>
      */
    })

})