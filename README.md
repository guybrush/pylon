# pylon               

* a pylon-server uses [socketvat] to provide a volatile storage for 
  pylon-client's. every client gets his own event-namespace (`<ip> <id> <key>`).
* every pylon-client has a local volatile storage which the pylon-server 
  will subscribe to when the client connects.
* when pylon-clients disconnect corresponding data will be deleted on 
  the pylon-server (emitting `del` devents).
* this is only an idea for now, maybe you want to look into [seaport] which 
  does similiar things differently.
                                           
## install

* install [node]
* `npm install pylon [-g]`

## cli

TBA

## usage
   
see [pylon-balancer] for now

[node]: http://nodejs.org
[socketvat]: https://github.com/guybrush/socketvat
[pylon-balancer]: https://github.com/guybrush/pylon-balancer
[seaport]: https://github.com/substack/seaport

