/* * /
var rap = require('remoteagent-protocol')
var net = require('net')
var l = console.log
var port = ~~(Math.random()*50000)+10000
var server = net.createServer(function(s){
  l('S> C connected')
  var r = new rap.Remote(s,s,0)
  s.on('end',function(){
    l('S> C disconnected')
    // here is where we need to release all functions
  })
  r.emitRemote('init',{name:function(cb){cb('server')}})
  r.once('init',function(fns){
    setInterval(function(){
      // this will Error since we cant write on the socket anymore
      fns.name(function(n){l('S> remote-name: '+n)})
    },1000)
  })
})
server.listen(port,function(){
  l('S> listening')
  var client = net.connect(port,function(){
    var r = new rap.Remote(client,client,1)
    r.emitRemote('init',{name:function(cb){cb('client')}})
    r.once('init',function(fns){
      fns.name(function(n){
        l('C> remote-name: '+n)
        setTimeout(function(){client.end()},1000)
      })
    })
  })
})

/* */

var rap = require('remoteagent-protocol')
var net = require('net')
var l = function(){} // console.log
var port = ~~(Math.random()*50000)+10000
var cc = {}
var i = 0 
var assert = require('assert')

var server = net.createServer(function(s){
  l('S> C connected')
  s.on('end',function(){l('S> client disconnected')})
  var r = new rap.Remote(s,s,0)
  r.emitRemote('init',{name:function(cb){cb('server')}})
  r.once('init',function(fns){fns.name(function(n){l('S> remote-name: '+n)})})
})
server.listen(port,function(){
  l('S> listening')
  setInterval(function(){createClients(10)},200)
})

function createClients(n) {
  if (n) for (var j=0;j<n;j++) createClients()
  var x = i++
  cc[x] = net.connect(port,function(){
    var r = new rap.Remote(cc[x],cc[x],1)
    r.emitRemote('init',{name:function(cb){cb('client')}})
    r.once('init',function(fns){fns.name(function(n){
      assert.equal(n,'server')
      setTimeout(function(){cc[x].end();delete cc[x]},2000)
    })})
  })
}

setInterval(function(){                                                        
  console.log
  ( 'nssocket-client(s)'
  , { t: ~~(process.uptime())+'sec'
    , RSS:process.memoryUsage().rss/1024+'kB'
    , i:i
    , cc:Object.keys(cc).length
    } )
},1000) 

/* */


