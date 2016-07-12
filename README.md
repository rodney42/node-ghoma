A control server for G-Homa Wifi plugs written in [node](http://nodejs.org).
Enables 

Installation
------------

```bash
$ npm install ghoma
```

Usage example
-------------

```js
var ghoma = require('ghoma');

// Uncomment this line to get a detailed console log output
// ghoma.log=console.log;

// A new plug was registered.
ghoma.onNew = function(ghoma) {
  console.log('Registerd    ' + ghoma.remoteAddress+"  "+ghoma.fullMac.toString('hex'));
  // Switch the plug on
  ghoma.on();
}

// Called when the plug switches on or off
ghoma.onStatusChange = function(ghoma) {
  console.log('New state of ' + ghoma.remoteAddress+' is '+ghoma.state+' triggered '+ghoma.triggered);
}

// Called when the plug connection to the server was lost
ghoma.onClose = function(ghoma) {
  console.log('Closed       ' + ghoma.remoteAddress);
}

/* Enable to listen for heartbeats of the plugs
ghoma.onHeartbeat = function(ghoma) {
  console.log('Heartbeat ' + ghoma.remoteAddress);
}
*/

// Start a listening server on this port
ghoma.startServer(4500);
```

Further information
-------------------

The network protocol was deciphered by others - full credits go to them.
See the [FHEM Wiki Page](http://www.fhemwiki.de/wiki/G-Homa) (german)
and
[Full disclosure for gHoma on seclists](http://seclists.org/fulldisclosure/2015/May/45) (german). The hardware producer site can be found
[here](http://www.g-homa.com/index.php/de/) (german).
