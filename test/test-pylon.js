var pylon = require('../pylon')
var fs = require('fs')
var assert = require('assert')
var ME = module.exports
var debug = require('debug')('test')
var destroyer = require('destroyer')
  
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
  var client1 = client1P.connect(port, function(r1,s1,id1,ip1){
    assert.ok(!!ip1)
    var client2 = client2P.connect(port, function(r2,s2,id2,ip2){
      assert.ok(!!ip2)
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

ME['reconnect'] = function(done){
  this.timeout(20000)
  var port = ~~(Math.random()*50000)+10000
  var p = pylon()

  var c = pylon()
  var x = 0
  var cId
  var pServer = p.listen(port)

  c.set('x',1)
  
  var P = plan(2,done)
  var cClient = c.connect(port,{reconnect:200},function(r,s,id){
    cId = id
    assert.equal(p.sockets.length,1)
    p.sockets[0].end()
    P.did()
  })
}

ME['stress'] = function(done) {
  this.timeout(2000)
  var port = ~~(Math.random()*50000)+10000
  var serverPylon = pylon()
  var server = pylon()
  var pylons = []
  var clients = []
  var opts = {port:port,reconnect:20}
  var watcher = pylon()
  var len = 0
  var keepTesting = true
  
  var nClients = 20
  var tAll = 500
  var tDiscClients = 20
  var tRestartServer = 100
   
  watcher.connect(opts,function(r,s,id,ip){
    len = 0
    r.on('del',function(){--len; debug(len)})
    r.on('set',function(){++len; debug(len)})
    r.once('keys',function(a,b){len += b.length; debug(len)})
    r.keys('.* .* name')
  })
  
  startServer()
  
  for (var i=0; i<nClients; i++) startClient(i)
  
  var iv = setInterval(disconnectClients,tDiscClients)
  
  setTimeout(function(){
    keepTesting = false
    clearInterval(iv)
    check()
    function check() {
      if (len == nClients) return done()
      setTimeout(check,20)
    }
  },tAll)
  
  function startClient(i) {
    pylons[i] = pylon()
    pylons[i].set('name','client'+i)
    clients[i] = pylons[i].connect(opts)
  }
  
  function startServer() {
    debug('startServer')
    var server = serverPylon.listen(port)            
    var destroy = destroyer(server)
    server.on('listening',function(){setTimeout(function(){
      if (!keepTesting) return
      destroy()
      startServer()
    },tRestartServer)})
  }
  
  function disconnectClients() {
    if (serverPylon.sockets[0]) serverPylon.sockets[0].end()
  }
}

