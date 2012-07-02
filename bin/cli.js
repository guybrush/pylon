#!/usr/bin/env node

var pylon = require('../')
  , opti = require('optimist')
  , path = require('path')
  , argv = opti.argv
  , pkg = require('../package.json')
  , AA = require('async-array')
  , fs = require('fs')
  , debug = require('debug')('pylon')
  , help = {}
  , cfg = {}
  , server
  
// node@0.6.x compat
fs.exists = fs.exists || path.exists
fs.existsSync = fs.existsSync || path.existsSync
  
cfg.port = Math.floor(Math.random() * 40000 + 10000)
cfg.host = '0.0.0.0'
cfg.remotes = {local:{port:cfg.port,host:cfg.host}}
  
help.logo = 
[ '           _'
, ' ___  _ _ | | ___  ___'
, '| . || | || || . ||   |'
, '|  _||_  ||_||___||_|_|'
, '|_|  |___|v'+pkg.version
].join('\n')
  
help.intro =
[ help.logo
, ''
//, 'pylon [-r <remote> [-c <cfgFile>]] [-p <port> [-h <host>]] <cmd> [<opts>]'
, 'pylon [-r remote] <cmd> [<opts>]'
, ''
, 'commands:'
, ''
, '   version .. print version-number'
, '   config  .. print config (this only works without -r)'
, '   start   .. start the pylon-server (this only works without -r)'
, '   keys    .. query for keys with regexp'
, '   on      .. subscribe to events'
, '   help    .. try `pylon help <command>` for more info'
].join('\n')

help.version =
[ 'pylon [-r <remote> [-f <cfgFile>]] [-p <port> [-h <host>]] version'
, ''
, 'examples:'
, ''
, '  pylon version .. print version of local installed pylon'
, '  pylon -r a1f  .. print version of remote running pylon'
, '  pylon -p 3000 -h 234.345.456.567 version .. print version of remote pylon..'
].join('\n')

help.start =
[ 'pylon start -p <port> [-h <host>] [-f <cfgFile>] [-k <pathToKey>] [-c <pathToCert>] [-C <pathToCA-dir]'
, ''
, 'examples:'
, ''
, '  pylon start -p 3000 -k /path/to/key.pem -c /path/to/cert.pem -C /path/to/caDir'
].join('\n')

help.on =
[ 'pylon [-r <remote> [-f <cfgFile>]] [-p <port> [-h <host>]] on <event>'
, ''
, 'examples:'
, ''
, '  pylon -r a1f on "set * * balancer"'
, '  pylon -r a1b on "**"'
].join('\n')

help.keys =
[ 'pylon [-r <remote> [-f <cfgFile>]] [-p <port> [-h <host>]] keys <regexp>'
, ''
, 'examples:'
, ''
, '  pylon -r a1f keys ".*"'
].join('\n')

if (!argv._[0]) return exit(null, help.intro)
  
parseArgs()


function parseArgs() {
  var cmd = argv._.shift()
  switch (cmd) {
    case 'version':
      exit(null,pkg.version)
      break
    case 'config':
      exit(null,pylon().config)
    case 'start':
      debug('parsing argv',argv)
      var p = pylon(argv.f)
      var opts = {}
      opts.port = argv.p || p.config.port || 3000
      opts.host = argv.h || p.config.host || '0.0.0.0'
      opts.key = (argv.k && fs.readFileSync(argv.k))
                 || (p.config.key && fs.readFileSync(p.config.key))
      opts.cert = (argv.c && fs.readFileSync(argv.c)) 
                 || (p.config.cert && fs.readFileSync(p.config.cert))
      opts.ca = (argv.C && readCa(argv.C))
                || (p.config.ca && readCa(p.config.ca))
      start(opts)
      function readCa(dir) {
        var files = fs.readdirSync(dir)
        var ca = []
        files.forEach(function(x,i){
          ca.push(fs.readFileSync(path.join(dir,x)))
        })
        return ca
      }
      function start(opts) {
        debug('starting',opts)
        var server = p.listen(opts,function(r,s){})
        server.on('listening',function(){
          console.log('pylon is listening',opts)
        })
        server.on('error',function(err){
          console.error(err)
        })
      }
      break
    case 'keys':
      var p = pylon(argv.f)
      var opts = argv.r || { port : argv.p || p.config.port || 3000
                           , key  : argv.k || p.config.key
                           , cert : argv.c || p.config.cert
                           }
      var keys = argv._[0] || '.*'
      var client = p.connect(opts,function(r,s){
        console.log('connected')
        r.once('keys',function(){
          exit(null,console.log(arguments))
        })
        r.keys(keys)
      })
      client.on('error',function(err){exit(err)})
      client.on('close',function(){console.log('close')})
      break
    case 'sub':
    case 'on':
      var p = pylon(argv.f)
      var opts = argv.r || { port : argv.p || p.config.port || 3000
                           , key  : argv.k || p.config.key
                           , cert : argv.c || p.config.cert
                           }
      var sub = argv._[0] || 'all'
      if (sub == 'all') sub = '**'
      var client = p.connect(opts,function(r,s){
        console.log('connected')
        var util = require('util')
        r.on(sub,function(){
          var args = [].slice.call(arguments)
          console.log(this.event,'→', args)
        })
      })
      client.on('error',exit)
      break
    case 'help':
      if (!argv._[0] || !help[argv._[0]])
        return exit(null, help.intro)
      exit(null, help[argv._[0]])
      break
    default:
      exit('unknown command: '+cmd)
  }
}

function exit(err,msg) {
  server && server.close()
  if (err) console.error('error:',err)
  else console.log(msg)
  process.exit(0)
}

