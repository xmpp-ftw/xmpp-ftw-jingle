var should = require('should')
  , Jingle = require('../../index')
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
            }
        }
        jingle = new Jingle()
        jingle.init(manager)
    })

    describe('Handles', function() {

        it('Handles jingle requests', function() {
            jingle.handles(helper.getStanza('stanzas/transport-info'))
                .should.be.true
        })
        
        it('Returns false for other stanzas', function() {
            jingle.handles(ltx.parse('<iq/>')).should.be.false
        })
        
    })

})
