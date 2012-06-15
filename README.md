foo# pylon               

* a pylon-server uses [socketvat] to provide a volatile storage for 
  pylon-client's. every client gets his own event-namespace (`<ip> <id> <key>`).
* every pylon-client has a local volatile storage which the pylon-server 
  will subscribe to when the client connects.
* when pylon-clients disconnect corresponding data will be deleted on 
  the pylon-server (emitting `del` devents).
                                           
## install

* install [node]
* `npm install pylon -g`
* `npm test pylon -g`
* `DEBUG=* npm test pylon -g`

## cli

TBA

## api
   
TBA

[node]: http://nodejs.org
[socketvat]: https://github.com/guybrush/socketvat

