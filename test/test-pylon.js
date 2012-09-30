var pylon = require('../pylon')
  , fs = require('fs')
  , assert = require('assert')
  , ME = module.exports
  , debug = require('debug')('test')
  
function ee2log(name){return function(){
  debug((name || '☼')+':',this.event,'→',[].slice.call(arguments))
}}

function plan(todo,cb) {
  if (!(this instanceof plan)) return new plan(todo,cb)
  var self = this
  self.todo = todo
  self.did = function(e) {if (--self.todo==0) cb && cb(e)}
}
  
ME.simple = function(done){
  var port = ~~(Math.random()*50000)+10000
  var serverP = pylon()
  var server = serverP.listen(port)
  var client1P = pylon()
  var client2P = pylon()
  var client1 = client1P.connect(port, function(r1,s1,id1){
    var client2 = client2P.connect(port, function(r2,s2,id2){
      var p = plan(2,done)
      var iv = setInterval(function(){
        client2P.set('foo','bla')
      },20)
      // <cmd> <ip> <id> <key>
      r1.once('set * '+id2+' foo',function(x){
        assert.equal(x,'bla')
        clearInterval(iv)
        p.did()
        client2.end()
      })
      r1.once('del * '+id2+' foo',function(){
        p.did()
        client1.end()
        server.close()
      })
    })
  })
}

