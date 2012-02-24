var pylon = require('../pylon')
  , assert = require('assert')

module.exports =
{ 'simple': function(done){
    var port = ~~(Math.random()*50000)+10000
    var server = pylon.listen(port)
    var clientA = pylon({foo:function(cb){cb('bar')}}).connect(port,function(rem){
      var setCount = 0
      var delCount = 0
      rem.subscribe('**',function(e,d){
        console.log(e,d)
        if (e.split('.')[0] == 'set') setCount++
        if (e.split('.')[0] == 'del') delCount++
        if (delCount == 10 && setCount == 10) {
          done()
        }
      })
      rem.get('foo',function(e,d){d[rem.id](function(d){
        assert.equal('bar',d)
      })})
      var i = 0
      var iv = setInterval(function(){
        var curr = i++
        if (curr == 9) clearInterval(iv)
        var clientX = pylon({foo:function(cb){cb('bar'+curr)}}).connect(port,function(rem){
          rem.subscribe('**',function(e,d){})
          rem.get('foo',function(e,d){
            d[rem.id](function(d){
              assert.equal(d,'bar'+curr)
              clientX.end()
            })
          })
        })
      },10)
    })
  }
}

