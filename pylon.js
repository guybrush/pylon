module.exports = pylon

var sv = require('socketvat')
var debug = require('debug')('pylon')
var fs = require('fs')
var path = require('path')
var _ = require('underscore')
var home = ( process.platform === "win32" )
           ? process.env.USERPROFILE
           : process.env.HOME

// node@0.6.x compat
fs.exists = fs.exists || path.exists
fs.existsSync = fs.existsSync || path.existsSync
 

// pylon('/path/to/config.{js,json}')
// pylon(remotes:{foo:{port:4545}}})
function pylon(opts) {
  if (!(this instanceof pylon)) return new pylon(opts)
  sv.call(this)
  this.remotes = {}
  this.config = {remotes:{}}
  opts = opts || home+'/.pylon/config.js'
  if (_.isString(opts) && fs.existsSync(opts))
    this.config = require(opts)
  else if (_.isObject(opts))
    this.config = opts
  this.config.remotes = this.config.remotes || {}
  this.config.ping = this.config.ping || {}
  this.config.ping.timeout = this.config.ping.timeout || 5000
  this.config.ping.interval = this.config.ping.interval || 10000
  this.config.reconnect = this.config.reconnect || 1000
  this.didInitArgs = false
  this.onConnectCb = false
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

pylon.prototype.connect = function(){
  var self = this
  var args = [].slice.call(arguments)

  if (!this.didInitArgs) {
    this.onConnectCb = typeof args[args.length-1] == 'function'
                     ? args.pop()
                     : null

    if (_.isString(args[0]) && this.config.remotes[args[0]]) {
      var c = this.config.remotes[args[0]]
      args[0] = {}
      if (c.host) args[0].host = c.host
      if (c.port) args[0].port = c.port
      if (c.cert) args[0].cert = fs.readFileSync(c.cert)
      if (c.key) args[0].key = fs.readFileSync(c.key)
    }
    this.didInitArgs = true
  }
  var argsReconnect
  args.forEach(function(x){if (x.reconnect) argsReconnect=true})
  if (!argsReconnect) args.push({reconnect:this.config.reconnect})
  args.push(onConnect)
  var client = sv.prototype.connect.apply(this,args)

  function onConnect(r,s){
    s.dataOnce('pylon::info',function(info){
      debug('got id',info)
      self.onConnectCb && self.onConnectCb(r,s,info.id,info.ip)
    })
    s.send('pylon::getInfo')
    s.data('pylon::ping',function(){
      s.send('pylon::ping')
    })
    s.on('error',function(err){debug('socket error',err)})
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
    var id = genId()
    while (self.remotes[id]) genId()
    self.remotes[id] = {remote:r,socket:s}
    var onend = function() {
      self.keys(new RegExp('^'+ip+' '+id)).forEach(function(x){
        debug('deleting',x)
        self.del(x)
      })
      s.destroy()
      delete self.remotes[id]
    }
    var iv = setInterval(function ping() {
      var to = setTimeout(function(){
        clearInterval(iv)
        onend()
      },self.config.ping.timeout)
      s.dataOnce('pylon::ping',function(){
        clearTimeout(to)
      })
      s.send('pylon::ping')
    },self.config.ping.interval)
    debug('client connected',{id:id,ip:ip,clientCount:Object.keys(self.remotes).length})
    s.data('pylon::getId',function(){s.send('pylon::id',id)})
    s.data('pylon::getInfo',function(){s.send('pylon::info',{id:id,ip:ip})})
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
      r.mget.apply(null,keys)
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
    s.on('end',onend)
    s.on('close',onend)
    s.on('error',onend)
    cb && cb(r,s,id,ip)
  }
  return server
}

function ee2log(name){return function(){
  debug((name || '☼')+':',this.event,'→',[].slice.call(arguments))
}}

function genId(len) {
  len = len ? parseInt(len) : 8
  var ret = ''
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWYXZabcdefghijklmnopqrstuvwyxz0123456789'
  while (len--)
    ret += chars[Math.round(Math.random() * (chars.length-1))]
  return ret
}

