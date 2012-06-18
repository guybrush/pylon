module.exports = pylon

var sv = require('socketvat')
var debug = require('debug')('pylon')
var fs = require('fs')
var path = require('path')
var _ = require('underscore')
var home = ( process.platform === "win32" )
           ? process.env.USERPROFILE
           : process.env.HOME

function pylon(opts) {
  if (!(this instanceof pylon)) return new pylon(opts)
  sv.call(this)
  this.remotes = {}
  this.config = {remotes:{}}
  opts = opts || home+'/.pylon/config.js'
  if (_.isString(opts) && path.existsSync(opts)) {
    this.config = require(opts)
  }
  else if (_.isObject(opts)) {
    this.config = require(opts)
  }
}

pylon.prototype = new sv

pylon.connect = function(){
  var p = pylon()
  pylon.prototype.connect.call(p,arguments)
}

pylon.listen = function(){
  var p = pylon()
  pylon.prototype.listen.call(p,arguments)
}

var didInitArgs
pylon.prototype.connect = function(){
  var args = [].slice.call(arguments)
  var cb = typeof args[args.length-1] == 'function'
           ? args.pop()
           : null
  if (!didInitArgs) {
    if (_.isString(args[0]) && this.config.remotes[args[0]])
      args[0] = this.config.remotes[args[0]]
    if (args[0].cert)
      args[0].cert = fs.readFileSync(args[0].cert)
    if (args[0].key)
      args[0].key = fs.readFileSync(args[0].key)
    didInitArgs = true
  }
  
  args.push(onConnectPylon)
  var client = sv.prototype.connect.apply(this,args)
  function onConnectPylon(r,s){
    debug('connected to pylon')
    s.dataOnce('pylon::id',function(id){
      debug('got id',id)
      cb && cb(r,s,id)
    })
    s.send('pylon::getId')
    s.on('error',function(err){debug('socket error',err)})
    s.on('close',function(){
      debug('socket closed')
      s.removeAllListeners()
      s.destroy()
      client.destroy()
    })
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
    var ip = s.socket.remoteAddress
    // s.onAny(ee2log('socket **'))
    var id = Math.floor(Math.random()*Math.pow(2,32)).toString(16)
    while (self.remotes[id]) Math.floor(Math.random()*Math.pow(2,32)).toString(16)
    self.remotes[id] = {remote:r,socket:s}
    debug('client connected',{id:id,ip:ip,clientCount:Object.keys(self.remotes).length})
    s.data('pylon::getId',function(){
      s.send('pylon::id',id)
    })
    r.on('*',function(){
      var args = [].slice.call(arguments)
      var method = this.event
      // for all methods which manipulate data: prefix keys with "<ip> <id> "
      switch (method) {
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
    r.once('keys',function(regexp,keys){
      r.once('mget',onMget)
      r.mget(keys)
      function onMget() {
        var args = [].slice.call(arguments)
        var vals = args.pop()
        args.forEach(function(x,i){
          debug('setting',ip+' '+id+' '+x, vals[i])
          self.set(ip+' '+id+' '+x, vals[i])
        })
      }
    })
    r.keys('.*')
    s.on('close',function(){
      debug('client disconnected',{id:id,ip:ip})
      self.keys(new RegExp('^'+ip+' '+id)).forEach(function(x){
        debug('deleting',x)
        self.del(x)
      })
      delete self.remotes[id]
    })
    s.on('error',function(err){
      debug('socket error',{id:id,ip:ip,error:err})
    })
    cb && cb(r,s,id)
  }
  return server
}

function ee2log(name){return function(){
  debug((name || '☼')+':',this.event,'→',[].slice.call(arguments))
}}

