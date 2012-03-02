var pylon = require('../pylon')
  , fs = require('fs')
  , assert = require('assert')

function ee2log(name){return function(){
  debug((name || '☼')+':',this.event,'→',[].slice.call(arguments))
}}

function plan(todo,cb) {
  if (!(this instanceof plan)) return new plan(todo,cb)
  var self = this
  self.todo = todo
  self.did = function(e) {if (--self.todo==0) cb && cb(e)}
}
  
module.exports =
{ 'simple': function(done){
    var port = ~~(Math.random()*50000)+10000
    var serverP = pylon()
    var server = serverP.listen(port)
    var clientP = pylon()
    clientP.set('x','y')
    var i = 0
    var iv = setInterval(function(){
      clientP.set('foo',i++)
    },10)
    var client = clientP.connect(port, function(r,s,id){
      var p = plan(10,done)
      var j = 0
      r.on('set * foo',function(x){
        if (x<=10) return p.did()
        client.end()
        server.close()
        clearInterval(iv)
      })
    })
  }
}

