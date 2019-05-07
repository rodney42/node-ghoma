/**
 * Usage example for the ghoma control server library together with a minimal express.js application.
 *
 * You have to run 'npm install express' before starting this example by 'node express_example.js'.
 * A ghoma control server is started on port 4196 and a http server is started on port 3000.
 *
 * Now you can open your browser with these urls:
 *
 * http://localhost:3000/list       Displays a list of all registered ghoma wifi plugs.
 * http://localhost:3000/allon      Switch all plugs on.
 * http://localhost:3000/alloff     Switch all plugs off.
 * http://localhost:3000/on/ID      Switch a plug on. Replace ID with the short mac, that can be retrieved by the 'list' call.
 * http://localhost:3000/off/ID     Switch a plug off. Replace ID with the short mac, that can be retrieved by the 'list' call.
 * http://localhost:3000/info/ID    Current info of a plug. Replace ID with the short mac, that can be retrieved by the 'list' call.
 * http://localhost:3000/state/ID   Current state of a plug. Replace ID with the short mac, that can be retrieved by the 'list' call.
 */
var ghoma = require('./ghoma.js');
var express = require('express');
var app = express();

// Uncomment this line to get a detailed log output
ghoma.log=console.log;

var httpPort = 3000;    // Express http listening port
var ghomaPort = 4196;   // G-Homa default port

/**
 * List all registered plugs.
 */
app.get('/list', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  var plugs = [];
  ghoma.forEach(function(plug) { plugs.push(plug); });
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
 * Retrieve the current info of a plug by id.
 */
app.get('/info/:id', function (req, res) {
    var plug = ghoma.get(req.params.id);
    if ( plug ) {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(plug));
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
      res.setHeader('Content-Type', 'text/plain');
      res.send(plug.state);
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
ghoma.startServer(ghomaPort);

// Start the express http server listening
app.listen(httpPort, function () {
  console.log('ghoma express example app start listening on port '+httpPort+' for http requests.');
});
