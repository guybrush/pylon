function ee2log(name){return function(){
  console.log((name || '☼')+':',this.event,'→',[].slice.call(arguments))
}}

/*

var pylon = require('pylon')
var server = pylon.listen(3000,function(){})
var client = pylon.connect(3000,function(rem){
  rem.set('balancer', { routes : 
                        [ { route  : 'foo.bar.com'
                          , host   : ''
                          , port   : 3434
                          , weight : 10 
                          } ] } )
  rem.get('balancer')
  rem.on('set *.balancer', function(event,data){})
})

*/


module.exports = pylon

var EE2 = require('eventemitter2').EventEmitter2
var sv  = socketvat // require('socketvat')

function pylon() {}

var EE2 = require('eventemitter2').EventEmitter2
var nss = require('nssocket')
var ev  = require('eventvat')
var net = require('net')
var tls = require('tls')
var fs  = require('fs')

function socketvat() {
  this.namespace = 'socketvat'
  this.sockets = []
  if (!(this instanceof socketvat)) return new socketvat()
  EE2.call(this,{wildcard:true,delimiter:' ',maxListeners:0})
  ev.call(this)
  return this
}

var p = socketvat.prototype = new ev

p.listen = function(port,cb) {
  var self = this
  var server = nss.createServer(function(s){
    self.initSocket(s,cb)
    //s.onAny(ee2log('S'))
  })
  server.listen(port)
  return server
}

p.connect = function(port,cb) {
  var self = this
  var client = new nss.NsSocket()
  client.connect(port)
  self.initSocket(client,cb)
  //client.onAny(ee2log('C'))
  return client
}

p.initSocket = function(s,cb) {
  var self = this
  s.data(self.namespace+'::**',function(){
    var method = this.event[2] == 'method' ? this.event[3] : null
    var event  = this.event[2] == 'event'  ? this.event[3] : null
    var args = this.event.slice(4)
    if (arguments) args = args.concat([].slice.call(arguments))
    // if (method) console.log('REMOTE WANTS TO '+method,args)
    // if (event) console.log('REMOTE DID '+event,args)
    if (method) {
      switch (method) {
        case 'on':
        case 'subscribe':
          args[0] = args[0].split('::').join(' ')
          self.on(args[0],function(){
            var event = [self.namespace,'event']
                          .concat(this.event.split(' '))
                          .concat([].slice.call(arguments))
            var data = event.pop()
            s.send(event,data)
          })
          break
        case 'unsubscribe':
          // #TODO
          break
        default: 
          if (self[method] && typeof self[method] == 'function')
            self[method].apply(self,args)
          else
            console.log('unknown method',method) 
      }
    }
  })
  var r = {}
  r.on = r.subscribe = function(event,cb,_cb){
    event = event.split(' ').join('::')
    s.data(self.namespace+'::event::'+event+'::**',cb)
    s.send([self.namespace,'method','on'],event,_cb)
  }
  r.unsubscribe = function(){} // #TODO
  ;['set','get'].forEach(function(m){
    r[m] = function(){
      var args = [].slice.call(arguments)
      var cb = typeof args[args.length-1] == 'function'
               ? args.pop() : null
      s.send([self.namespace,'method',m].concat(args),cb)
    }
  })
  cb && cb(r,s)
}

/* */

var sv = socketvat

var serverVat = sv()
serverVat.listen(3000,function(r){
  r.on('**',function(){
    console.log('REMOTE CLIENT:',this.event,'→',[].slice.call(arguments))
  })
  r.on('error',function(){})
  r.on('end',function(){})
  r.set('server','x')   
})                              

var clientVat = sv()
clientVat.connect(3000,function(r){
  r.on('*',function(){
    console.log('REMOTE SERVER:',this.event,'→',[].slice.call(arguments))
  })
  r.set('client','y',function(err){console.log('sent the message')}) 
  r.get('client')
})

serverVat.on('*',function(){
    console.log('LOCAL SERVER:',this.event,'→',[].slice.call(arguments))
  })
clientVat.on('*',function(){
    console.log('LOCAL CLIENT:',this.event,'→',[].slice.call(arguments))
  })

serverVat.set('foo','bar')
clientVat.set('foo','bar')

/* */

