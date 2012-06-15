#!/usr/bin/env node

var pylon = require('../')
  , opti = require('optimist')
  , argv = opti.argv
  , pkg = require('../package.json')
  , AA = require('async-array')
  , fs = require('fs')
  , debug = require('debug')('pylon')
  , help = {}
  , cfg = {}
  , server
  
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
, '   sub     .. subscribe to events'
, '   help    .. try `pylon help <command>` for more info'
].join('\n')

help.version =
[ 'pylon [-r <remote> [-c <cfgFile>]] [-p <port> [-h <host>]] version'
, ''
, 'examples:'
, ''
, '   pylon version .. print version of local installed pylon'
, '   pylon -r a1f  .. print version of remote running pylon'
, '   pylon -p 3000 -h 234.345.456.567 version .. print version of remote pylon..'
].join('\n')

help.start =
[ 'pylon start -p <port> [-h <host>] [-k <pathToKey>] [-c <pathToCert>] [-C <pathToCA-dir]'
].join('\n')


help.on =
[ 'pylon [-r <remote> [-c <cfgFile>]] [-p <port> [-h <host>]] on <event>'
, ''
, 'examples:'
, ''
, '   pylon -r a1f on "set * balancer"'
, '   pylon -r a1b on "**"'
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
      exit(null,cfg)
    case 'start':
      debug('parsing argv',argv)
      var opts = {}
      if (!argv.p) return exit(new Error('no port (-p) defined'))
      opts.port = argv.p
      opts.host = argv.h || '0.0.0.0'
      if (!argv.k || !argv.c) return start(opts)
      opts.key = fs.readFileSync(argv.k)
      opts.cert = fs.readFileSync(argv.c)
      if (!argv.C) return start(opts) 
      fs.readdir(argv.C,function(err,data){
        if (data.length > 0) {
          debug('readdir ca',data)
          opts.requestCert = true
          opts.rejectUnauthorized = true
          new AA(data).map(function(x,i,next){
            debug('reading ca-file',argv.ca+'/'+x)
            fs.readFile(argv.C+'/'+x,next)
          }).done(function(err, data){
            if (err) return exit(new Error(err))
            opts.ca = data
            start(opts)
          }).exec()
        } else {
          start(opts)
        }
      })
      function start(opts) {
        debug('starting',opts)
        var server = pylon().listen(opts,function(r,s){})
        server.on('listening',function(){
          console.log('pylon is listening',opts)
        })
        server.on('error',function(err){
          console.error(err)
        })
      }
      break
    case 'set':
    case 'get':
    case 'del':
    case 'subscribe':
      exit('not implemented yet')
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
  if (err) console.error(err)
  else console.log(msg)
  process.exit(0)
}

