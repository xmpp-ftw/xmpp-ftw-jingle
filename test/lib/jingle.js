'use strict';

var Jingle = require('../../index')
  , ltx    = require('ltx')
  , helper = require('../helper')

/* jshint -W030 */
describe('Jingle', function() {

    var jingle, socket, xmpp, manager

    before(function() {
        socket = new helper.SocketEventer()
        xmpp = new helper.XmppEventer()
        manager = {
            socket: socket,
            client: xmpp,
            trackId: function(id, callback) {
                if (typeof id !== 'object')
                    throw new Error('Stanza ID spoofing protection not implemented')
                this.callback = callback
            },
            makeCallback: function(error, data) {
                this.callback(error, data)
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
