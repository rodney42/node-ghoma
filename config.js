/**
 * Utitility programm to change the control server of a G-Homa plug.
 *
 * Usage:
 * node config.js <ghoma plug address> <control server address> <control server port>
 * for example:
 * node config.js 192.168.178.234 192.168.178.1 4196
 *
 * Using host names should also work.
 */
var dgram = require('dgram');

var helloMessage = new Buffer("HF-A11ASSISTHREAD");
var gHomaAddress = process.argv[2];
var controlServer = process.argv[3];
var controlPort = process.argv[4];
var initDone=false;

var client = dgram.createSocket("udp4");

send(helloMessage);

function send(message) {
  console.log('SEND      : '+ message);
  client.send(message, 0, message.length, 48899, gHomaAddress);
}

client.on('listening', function () {
  var address = client.address();
  console.log('LISTENING : ' + address.address + ":" + address.port);
});

client.on('message', function (message, remote) {
  console.log('RECEIVE   : '+ message);
  if( !initDone ) {
    initDone =true;
    send(new Buffer("+ok"));        // Reply to first received data
    //send(new Buffer("AT+H\r"));   // Uncomment to see the help page
    send(new Buffer("AT+VER\r"));   // Request the version
    send(new Buffer("AT+NETP=TCP,Client,"+controlPort+","+controlServer+"\r"));   // Send new network parameter
    send(new Buffer("AT+NETP\r"));  // See the new settings

    // Wait a while for replies and close
    setTimeout(function() {
      console.log('CLOSING');
      client.close();
    },1000*10)
  }
});
