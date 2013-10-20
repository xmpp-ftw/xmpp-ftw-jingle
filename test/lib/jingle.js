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
            }
        }
        jingle = new Jingle()
        jingle.init(manager)
    })

    describe('Handles', function() {
        
        it('Returns false for all stanzas', function() {
            avatar.handles(ltx.parse('<iq/>')).should.be.false
        })
        
    })

})   
