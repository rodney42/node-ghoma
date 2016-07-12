var ghoma = require('./ghoma.js');

// Uncomment this line to get a detailed log output
// ghoma.log=console.log;

// Register a listener for new plugs
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
