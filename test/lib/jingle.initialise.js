var should = require('should')
  , Jingle = require('../../lib/jingle')
  , ltx    = require('ltx')
  , helper = require('../helper')

describe('Jingle', function() {

    var jingle, socket, xmpp, manager

    before(function() {
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

        it('Sends expected stanza', function(done) {
            var request = {
                to: 'juliet@shakespeare.lit/balcony',
                sessionId: '12345',
                name: 'session-name-value'
            } 
            
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.id.should.exist
                stanza.attrs.to.should.equal(request.to) 
                stanza.attrs.type.should.equal('set')
                var element = stanza.getChild('jingle', jingle.NS)
                element.should.exist
                element.attrs.action.should.equal('session-initiate')
                element.attrs.sid.should.equal(request.sessionId)
                element.attrs.initiator.should.equal(
                   manager.fullJid.user + '@' + manager.fullJid.domain + '/' +
                   manager.fullJid.resource
                )
                var content = element.getChild('content')
                content.should.exist
                content.attrs.creator.should.equal('initiator')
                content.attrs.name.should.equal(request.name)
  
                done()
            })
            socket.emit('xmpp.jingle.initiate', request, function() {})
        })
        
    })

})   
