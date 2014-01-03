'use strict';

var should = require('should')
  , Jingle = require('../../index')
  , helper = require('../helper')

/* jshint -W030 */
describe('Jingle', function() {

    var jingle, socket, xmpp, manager, request, stanza

    before(function() {
        request = require('../resources/json/transport-info.json')
        stanza  = helper.getStanza('stanzas/transport-info')

        socket  = new helper.SocketEventer()
        xmpp    = new helper.XmppEventer()
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

    beforeEach(function() {
        socket.removeAllListeners()
        xmpp.removeAllListeners()
        jingle.init(manager)
    })

    describe('Outgoing transport Info', function() {

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
            socket.send('xmpp.jingle.request', {})
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
            socket.send('xmpp.jingle.request', {}, true)
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
            socket.send(
                'xmpp.jingle.request',
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
            socket.send(
                'xmpp.jingle.request',
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
            socket.send(
                'xmpp.jingle.request',
                request,
                callback
            )
        })

        it('Sends expected stanza', function(done) {

            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.id.should.exist
                stanza.attrs.to.should.equal(request.to)
                stanza.attrs.type.should.equal('set')
                var element = stanza.getChild('jingle', jingle.NS)
                element.should.exist
                element.attrs.action.should.equal('transport-info')
                element.attrs.sid.should.equal(request.jingle.sid)
                done()
            })
            socket.send('xmpp.jingle.request', request, function() {})
        })

        it('Sends expected stanza with content element', function(done) {

            xmpp.once('stanza', function(stanza) {
                var elements = stanza.getChild('jingle', jingle.NS)
                    .getChildren('content')
                elements.length.should.equal(1)
                var content = elements[0]
                content.attrs.name.should.equal(request.jingle.contents[0].name)
                content.attrs.creator
                    .should.equal(request.jingle.contents[0].creator)

                done()
            })
            socket.send('xmpp.jingle.request', request, function() {})
        })

        it('Sends expected stanza with transport element', function(done) {

            xmpp.once('stanza', function(stanza) {
                var transport = stanza.getChild('jingle', jingle.NS)
                    .getChildren('content')[0]
                    .getChild('transport', jingle.NS_TRANSPORT)
                transport.should.exist
                done()
            })
            socket.send('xmpp.jingle.request', request, function() {})
        })

        it('Sends expected stanza with transport candidates', function(done) {

            var candidateRequest = request.jingle.contents[0].transport.candidates[0]

            xmpp.once('stanza', function(stanza) {
                var candidates = stanza.getChild('jingle', jingle.NS)
                    .getChildren('content')[0]
                    .getChild('transport', jingle.NS_TRANSPORT)
                    .getChildren('candidate')
                candidates.length.should.equal(1)
                var candidate = candidates[0]
                candidate.attrs.type.should.equal(candidateRequest.type)
                candidate.attrs.protocol.should.equal(candidateRequest.protocol)
                candidate.attrs.id.should.equal(candidateRequest.id)
                candidate.attrs.ip.should.equal(candidateRequest.ip)
                candidate.attrs.component
                    .should.equal(candidateRequest.component)
                candidate.attrs.port.should.equal(candidateRequest.port)
                candidate.attrs.foundation
                    .should.equal(candidateRequest.foundation)
                candidate.attrs.generation
                    .should.equal(candidateRequest.generation)
                candidate.attrs.priority.should.equal(candidateRequest.priority)
                candidate.attrs.network.should.equal(candidateRequest.network)
                done()
            })
            socket.send('xmpp.jingle.request', request, function() {})
        })
    })

    describe('Incoming transport Info', function() {

        it('Generates expected JSON payload', function(done) {
            socket.on('xmpp.jingle.request', function(data) {
                JSON.stringify(data).should.eql(
                    JSON.stringify(
                        require('../resources/json/transport-info-incoming.json')
                    )
                )
                done()
            })
            jingle.handle(stanza).should.be.trues
        })

    })

})
