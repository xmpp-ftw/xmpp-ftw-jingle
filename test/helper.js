var ltx = require('ltx')
  , fs = require('fs')
  , Event = require('events').EventEmitter

exports.getStanza = function(file) {
    var stanza = fs.readFileSync(__dirname + '/resources/' + file)
    var stanzaStr = stanza.toString()
        .replace(/[\n\r]/g, '')
        .replace(/>\s{1,}/g, '>')
    return ltx.parse(stanzaStr)
}

var Eventer = function() {}
Eventer.prototype.__proto__ = Event.prototype
Eventer.prototype.send = function(stanza) {
    this.emit('stanza', stanza.root())
}
exports.Eventer = Eventer

exports.failingItemParser = function() {
   throw new Error('FAIL!')
}
