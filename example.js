var ghoma = require('./ghoma.js');

// Uncomment this line to get a detailed log output
// ghoma.log=console.log;

// Register a listener for new plugs
ghoma.onNew = function(plug) {
  console.log('Registerd    '+plug.remoteAddress+" "+plug.id);
  // For this example switch the plug on in the moment it is registered.
  plug.on();
}

// Called when the plug switches on or off
ghoma.onStatusChange = function(plug) {
  console.log('New state of '+plug.remoteAddress+' is '+plug.state+' triggered '+plug.triggered);
}

// Called when a enery measurement value was reported
ghoma.onMeasurement = function(plug, property) {
  console.log('Measured ' +property+' at '+plug.remoteAddress+'. Value is '+plug.energy[property].value);
}


// Called when the plug connection to the server was lost
ghoma.onClose = function(plug) {
  console.log('Closed ' + plug.remoteAddress);
}

// Listen for heartbeats of the plugs
ghoma.onHeartbeat = function(plug) {
  console.log('Heartbeat ' + plug.remoteAddress);
}

// Start a listening server on this port
ghoma.startServer(4196);

/* Example:
 * Iterate through each found plug
 *
ghoma.forEach(function(plug,idx) {
  console.log(idx+' '+plug.id+' '+plug.remoteAddress);
});
*/
