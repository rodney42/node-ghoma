A control server for G-Homa Wifi plugs written in [node](http://nodejs.org).

Enables the use of the wifi plugs without the need to allow them to call home. The usefulness of this library is limited, as long as you don't use it together with a framework like [express.js](https://expressjs.com/).

Installation
------------

```bash
$ npm install ghoma
```

Usage examples
--------------

This example shows the callback methods provided.

```js
var ghoma = require('ghoma');

// Uncomment this line to get a detailed console log output
// ghoma.log=console.log;

// A new plug was registered.
ghoma.onNew = function(ghoma) {
  console.log('Registerd    ' + ghoma.remoteAddress+"  "+ghoma.id);
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
ghoma.startServer(4196);
```

The next example shows the node-ghoma library in combination with the express framework.

```js
/**
 * Usage example for the ghoma control server library together with a minimal express.js application.
 *
 * You have to 'npm install express' before starting this example by 'node express_example.js'.
 * A ghoma control server is started on port 4196 and a http server is started on port 3000.
 *
 * Now you can open your browser with these urls:
 *
 * http://localhost:3000/list       Displays a list of all registered ghoma wifi plugs.
 * http://localhost:3000/allon      Switch all plugs on.
 * http://localhost:3000/alloff     Switch all plugs off.
 * http://localhost:3000/on/ID      Switch a plug on. Replace ID with the short mac, that can be retrieved by the 'list' call.
 * http://localhost:3000/off/ID     Switch a plug off. Replace ID with the short mac, that can be retrieved by the 'list' call.
 * http://localhost:3000/state/ID   Current state of a plug. Replace ID with the short mac, that can be retrieved by the 'list' call.
 */
var ghoma = require('./ghoma.js');
var express = require('express');
var app = express();

// Uncomment this line to get a detailed log output
// ghoma.log=console.log;

/**
 * List all registered plugs.
 */
app.get('/list', function (req, res) {
  var plugs = [];
  ghoma.forEach(function(plug,idx) {
    plugs.push( {
      id : plug.id,
      state : plug.state,
    });
  });
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(plugs));
});

/**
 * Switch a plug on by id
 */
app.get('/on/:id', function (req, res) {
    var plug = ghoma.get(req.params.id);
    if ( plug ) {
      plug.on();
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
});

/**
 * Switch a plug off by id
 */
app.get('/off/:id', function (req, res) {
    var plug = ghoma.get(req.params.id);
    if ( plug ) {
      plug.off();
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
});

/**
 * Retrieve the current state of a plug by id.
 */
app.get('/state/:id', function (req, res) {
    var plug = ghoma.get(req.params.id);
    if ( plug ) {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(plug));
    } else {
      res.sendStatus(404);
    }
});

/**
 * Switch all registered plugs on
 */
app.get('/allon', function (req, res) {
  ghoma.forEach(function(plug,idx) { plug.on(); });
  res.sendStatus(200);
});

/**
 * Switch all registered plugs off
 */
app.get('/alloff', function (req, res) {
  ghoma.forEach(function(plug,idx) { plug.off(); });
  res.sendStatus(200);
});

// Register a listener for new plugs, this is only for a log output
ghoma.onNew = function(plug) {
  console.log('Registerd plug from ' + plug.remoteAddress+" with id "+plug.id);
}

// Start the ghoma control server listening server on this port
ghoma.startServer(4196);

// Start the express http server listening on port 3000
app.listen(3000, function () {
  console.log('ghoma express example app start listening on port 3000 for http requests.');
});

```


API description
---------------

### Notifications
These notifications are triggered. See also example above.

#### onNew(ghoma)
Called when a new plug is registered with the control server.

#### onStatusChange(ghoma)
Called if the plug was switched on or off.

#### onClose(ghoma)
Called if the connection to the plug was lost.

#### onHeartbeat(ghoma)
Called when a heartbeat event from the plug occurred.


### Methods
Methods provided by the module.

#### forEach(callback)
Iterate through each registered ghome plug object.

#### get(id)
Helper method to get a plug by id. The id is the hex representation of the short mac of the plug. It can be used to unique identify the plug.

### The ghoma object

The ghoma object is used as callback argument for each notification and as a result of method calls.

```js
{
  "state": "on",          // 'on' or 'off'
  "triggered": "local",   // 'local' or 'remote'. 'local' if the plug button was used.
  "remoteAddress": "::ffff:192.168.12.136",
  "remotePort": 12635,
  "initalized": "2016-07-24T20:57:00.525Z",  // First seen time
  "shortMac": {
    "type": "Buffer",
    "data": [
      ...
    ]
  },
  "id": "62ad10",   // id from the short mac
  "fullMac": {
    "type": "Buffer",
    "data": [
    ...
    ]
  },
  "prevstate": "unknown",  // The previous state is unknown if the plug was yet registered. 'on' or 'off' otherwise
  "statechanged": "2016-07-26T20:57:02.975Z"  // / Last state change
}
```

G-Homa installation
-------------------

With firmware version <=1.0.06 you can use the embedded web server to adjust the control server address. See the fhem wiki page for instructions.
With newer firmware version, this easy way to configure the plug is disabled. The only known way to run your own control server is to setup your own DNS and DHCP service. Then the DNS entry for 'plug.g-homa.com' must point to your own server and you are forced to use '4196' as listening port.

Further information
-------------------

The network protocol was deciphered by others - full credits go to them.
See the [FHEM Wiki Page](http://www.fhemwiki.de/wiki/G-Homa) (german)
and
[Full disclosure for gHoma on seclists](http://seclists.org/fulldisclosure/2015/May/45) (german).

The hardware producer site can be found
[here](http://www.g-homa.com/index.php/de/) (also in german).
