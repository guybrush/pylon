#!/usr/bin/env node

var pylon = require('../')
  , opti = require('optimist')
  , argv = opti.argv
  , _pkg = require('../package.json')
  , _help = {}
  , _config = {}
  , _conn
  , _server
  
_config.port = Math.floor(Math.random() * 40000 + 10000)
_config.host = '0.0.0.0'
_config.remotes = {local:{port:_config.port,host:_config.host}}
  
_help.logo = 
[ '           _'
, ' ___  _ _ | | ___  ___'
, '| . || | || || . ||   |'
, '|  _||_  ||_||___||_|_|'
, '|_|  |___|v'+_pkg.version
].join('\n')
  
_help.intro =
[ _help.logo
, ''
, 'pylon [-r <remote>] [-c <path to configFile>] [<command> [<options>]]'
, ''
, 'commands:'
, ''
, '   version   .. print version-number'
, '   config    .. get/set config'
, '   start     .. start the pylon-server (this only works without -r)'
, '   set       .. set entries'
, '   get       .. get entries'
, '   del       .. delete entries'
, '   subscribe .. subscribe to events'
, '   help      .. try `pylon help <command>` for more info'
, ''
].join('\n')

_help.version =
[ ''
, ''
].join('\n')

_help.config =
[ ''
, ''
].join('\n')

_help.start =
[ ''
, ''
].join('\n')

_help.set =
[ ''
, ''
].join('\n')

_help.get =
[ ''
, ''
].join('\n')

_help.del =
[ ''
, ''
].join('\n')

_help.subscribe =
[ ''
, ''
].join('\n')

if (!argv._[0]) return exit(null, _help.intro)
  
parseArgs()


function parseArgs() {
  var cmd = argv._.shift()
  switch (cmd) {
    case 'version':
      exit(null,_pkg.version)
      break
    case 'config':
      exit(null,_config)
    case 'start':
      var opts = {}
      opts.port = _config.port
      opts.host = _config.host
      _server = pylon().listen(opts,function(){})
      _server.on('ready',function(){
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
      if (!argv._[0] || !_help[argv._[0]])
        return exit(null, _help.intro)
      exit(null, _help[argv._[0]])
      break
    default:
      exit('unknown command: '+cmd)
  }
}

function exit(err,msg) {
  _conn && _conn.end()
  _server && _server.close()
  if (err) console.error(err)
  else console.log(msg)
  process.exit(0)
}

