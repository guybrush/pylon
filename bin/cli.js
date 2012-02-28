#!/usr/bin/env node

var pylon = require('../')
  , opti = require('optimist')
  , argv = opti.argv
  , pkg = require('../package.json')
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
, 'pylon [-r <remote> [-c <cfgFile>]] [-p <port> [-h <host>]] <cmd> [<opts>]'
, ''
, 'commands:'
, ''
, '   version .. print version-number'
, '   config  .. print config'
, '   start   .. start the pylon-server (this only works without -r)'
, '   keys    .. query for keys with regexp'
, '   on      .. subscribe to events'
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
[ 'pylon start -p <port> [-h <host>]'
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
      var opts = {}
      opts.port = cfg.port
      opts.host = cfg.host
      server = pylon().listen(opts,function(){})
      server.on('ready',function(){
        console.log('pylon is listening on '+opts.host+':'+opts.port)
      })
      break
    case 'set':
      pylon.connect()
      break
    case 'get':
      pylon.connect()
      break
    case 'del':
      pylon.connect()
      break
    case 'subscribe':
      pylon.connect()
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

