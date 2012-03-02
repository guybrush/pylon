module.exports = pylon

var sv  = require('socketvat')

var remotes = {}

function pylon(opts) {
  if (!(this instanceof pylon)) return new pylon(opts)
  sv.call(this)
}

pylon.prototype = new sv

pylon.listen = function(opts,cb){
  var p = pylon()
  pylon.prototype.listen.call(p,opts,cb)
}

pylon.prototype.connect = function(){
  var args = [].slice.call(arguments)
  var cb = typeof args[args.length-1] == 'function'
           ? args[args.length-1]
           : function(){}
  args.push(onConnect)
  var client = sv.prototype.connect.apply(this,args)
  function onConnect(r,s){
    s.dataOnce('pylon::id',function(id){cb && cb(r,s,id)})
    s.send('pylon::getId')
  }
  return client
}

pylon.prototype.listen = function(){
  var self = this
  var args = [].slice.call(arguments)
  var cb = typeof args[args.length-1] == 'function'
           ? args[args.length-1]
           : function(){}
  args.push(onListen)
  var server = sv.prototype.listen.apply(this,args)
  function onListen(r,s) {
    var id = Math.floor(Math.random()*Math.pow(2,32)).toString(16)
    while (remotes[id]) Math.floor(Math.random()*Math.pow(2,32)).toString(16)
    remotes[id] = {remote:r,socket:s}
    s.dataOnce('pylon::getId',function(){
      s.send('pylon::id',id)
    })
    r.on('*',function(){
      var args = [].slice.call(arguments)
      var method = this.event
      switch(method) {
        case 'set':
          args[0] = id+' '+args[0]
          self[method].apply(self,args)
          break
        default: ;
      }
    })
    r.once('keys',function(keys,regexp){
      r.on('get',onGet)
      r.unsubscribe('get')
      function onGet(k,v) {
        self.set(id+' '+k,v)
      }
      keys.forEach(function(x){r.get(x)})
    })
    r.keys('.*')
    s.on('close',function(){
      self.keys(new RegExp('^'+id)).forEach(function(x){
        self.del(x)
      })
      delete remotes[id]
    })
    cb && cb(r,s,id)
  }
  return server
}

/* * /

var serverP = pylon()
serverP.onAny(ee2log('server-any'))
var server = serverP.listen(3000,function(){})

var clientP = pylon()
clientP.onAny(ee2log('client-any'))
clientP.set('x','y')
var client = clientP.connect(3000, function(r,s,id){
  r.onAny(ee2log('client-remote'))
  setTimeout(function(){
    client.end()
  },2000)
})
var i = 0
setInterval(function(){
  clientP.set('foo',i++)
},500)

function ee2log(name){return function(){
  console.log((name || '☼')+':',this.event,'→',[].slice.call(arguments))
}}

/* */

