module.exports = pylon

var sv = require('socketvat')
var debug = require('debug')('pylon')

var remotes = {}

function pylon(opts) {
  if (!(this instanceof pylon)) return new pylon(opts)
  sv.call(this)
}

pylon.prototype = new sv

pylon.connect = function(){
  var p = pylon()
  //p.onAny(function(){debug('p **',this.event,arguments)})
  pylon.prototype.connect.call(p,arguments)
}

pylon.listen = function(){
  var p = pylon()
  //p.onAny(function(){debug('p **',this.event,arguments)})
  pylon.prototype.listen.call(p,arguments)
}

pylon.prototype.connect = function(){
  var args = [].slice.call(arguments)
  var cb = typeof args[args.length-1] == 'function'
           ? args[args.length-1]
           : function(){}
  args.push(onConnect)
  var client = sv.prototype.connect.apply(this,args)
  function onConnect(r,s){
    debug('connected')
    s.dataOnce('pylon::id',function(id){
      debug('got id',id)
      cb && cb(r,s,id)
    })
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
    debug('client connected',s.socket.remoteAddress)
    var ip = s.socket.remoteAddress
    s.onAny(ee2log('socket **'))
    var id = Math.floor(Math.random()*Math.pow(2,32)).toString(16)
    while (remotes[id]) Math.floor(Math.random()*Math.pow(2,32)).toString(16)
    remotes[id] = {remote:r,socket:s}
    s.data('pylon::getId',function(){
      s.send('pylon::id',id)
    })
    r.on('*',function(){
      var args = [].slice.call(arguments)
      var method = this.event
      // for all methods which manipulate data: prefix keys with "<ip> <id> "
      switch(method) {
        case 'set':
        case 'del':
        // case 'exists':
        // case 'expire':     // emits del
        // case 'expireat':   // emits del
        // case 'persist':
        case 'append':
        case 'decr':
        case 'decrby':
        case 'incr':
        case 'incrby':
        // case 'setbit':     // not implemented yet
        // case 'setex':      // not implemented yet
        // case 'setnx':      // emits set
        // case 'mset':       // emits set
        // case 'msetnx':     // emits set
        case 'setrange':
        case 'hdel':
        case 'hincr':
        case 'hincrby':
        case 'hdecr':
        case 'hdecrby':
        case 'hset':
        // case 'hsetnx':     // emits hset
        case 'lpop':
        case 'lpush':
        case 'lpushx':
        case 'lrem':
        case 'lset':
        case 'ltrim':
        case 'rpop':
        case 'rpush':
        case 'rpushx':
          args[0] = ip+' '+id+' '+args[0]
          self[method].apply(self,args)
          break
        case 'rename':
        case 'renamenx':
        case 'swap':
          args[0] = ip+' '+id+' '+args[0]
          args[1] = ip+' '+id+' '+args[1]
          self[method].apply(self,args)
          break
        default: ;
      }
    })
    r.once('keys',function(keys,regexp){
      r.once('mget',onMget)
      r.mget(keys)
      function onMget() {
        var args = [].slice.call(arguments)
        var vals = args.pop()
        args.forEach(function(x,i){
          self.set(ip+' '+id+' '+x, vals[i])
        })
      }
    })
    r.keys('.*')
    s.on('close',function(){
      self.keys(new RegExp('^'+ip+' '+id)).forEach(function(x){
        self.del(x)
      })
      delete remotes[id]
    })
    cb && cb(r,s,id)
  }
  return server
}

function ee2log(name){return function(){
  debug((name || '☼')+':',this.event,'→',[].slice.call(arguments))
}}

