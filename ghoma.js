/**
 * Node.js implementation of a G-Homa Control Server
 * See : http://www.fhemwiki.de/wiki/G-Homa
 *
 * Tested with GAO G-Homa EMW302WF (IP20) and G-Homa EMW302WFO (IP44).
 */
var net = require('net');

// Prefix bytes for each data block
var PREFIX = new Buffer([0x5A,0xA5]);
// Postfix bytes for each data block
var POSTFIX = new Buffer([0x5B,0xB5]);

var INIT1A  = new Buffer([0x02,0x05,0x0D,0x07,0x05,0x07,0x12]);
var INIT1B  = new Buffer([0x02]);
var INIT2   = new Buffer([0x05,0x01])
var HEARTBEATREPLY  = new Buffer([0x06]);

var CMD_INIT1REPLY = new Buffer([0x03]);
var CMD_INIT2REPLY = new Buffer([0x07]);
var CMD_HEARTBEAT = new Buffer([0x04]);
var CMD_STATUS = new Buffer([0x90]);

var msg_padding ='             ';
var action_padding ='         ';

// Registry for nodes
var gHomaRegistry = [];
// Timeout to kick the nodes that have not send a heartbeat in some time
var timeout = 60000*5; // 5 Minutes

var server = net.createServer(function(socket) {
  log('','CONNECTED');

  // Should be default 'true' - but who knows
  socket.setNoDelay(true);

  // Used as receive buffer
  var buffer = new Buffer(0);

  // Initialize ghoma object
  var ghoma = {
    state : 'unknown',
    triggered : 'unknown',
    remoteAddress : socket.remoteAddress,
    remotePort : socket.remotePort,
    initalized : new Date(),
    lastheartbeat : new Date(),
    reregistered : 0,
    on : switchOn,
    off : switchOff,
    socket : socket
  }

  // Send init 1 msg
  var init1Msg = Buffer.concat([
    BuildMsg(INIT1A),
    BuildMsg(INIT1B),
  ]);
  send('INIT1',init1Msg);

  // Add a 'data' event handler to this instance of socket
  socket.on('data', function(data) {
      log('RECV', 'DATA', data);
      buffer = Buffer.concat([buffer, data]);
      var msg=nextMsg();
      while( msg ) {
        if( msg.command.equals( CMD_INIT1REPLY ) ) {
          ghoma.shortMac = msg.payload.slice(6,9);
          ghoma.id = ghoma.shortMac.toString('hex');
          // Remember the trigger code - used for on/off.
          ghoma.triggercode = msg.payload.slice(4,6);
          send('INIT2', BuildMsg(INIT2));
        } else if( msg.command.equals( CMD_INIT2REPLY ) ) {
          log('HANDLE', 'INIT2 RPLY');
          // Init2 reply comes 2 times - the first has the full mac address at the end of the paylod
          var fullMac = msg.payload.slice(msg.payload.length-6,msg.payload.length);

          if( ghoma.shortMac.equals(fullMac.slice(3))) {
            // Fullmac and shotmac matches -> first reply
            ghoma.fullMac = fullMac;
          } else {
            // Fullmac and shotmac does not match -> second reply -> remember it.
            var idx = indexOfById(ghoma.id);
            if( idx != -1 ) {
              // A reconnect of a existing. Replace existing.
              log('INFO','REREG' );
              if( exports.onClose ) {
                exports.onClose(gHomaRegistry[idx]);
              }
              ghoma.reregistered = gHomaRegistry[idx].reregistered + 1;
              gHomaRegistry[idx] = ghoma;
            } else {
              // a new never seen plug
              log('INFO','REG');
              gHomaRegistry.push(ghoma);
            }

            // notify listener about the new plug
            if( exports.onNew ) {
              exports.onNew(ghoma);
            }

          }
        } else if( msg.command.equals( CMD_STATUS ) ) {
          log('HANDLE', 'STATUS', msg.payload);

          var newstate = 'unknown';
          if( msg.payload[msg.payload.length-1] == 0xff ) {
            newstate = 'on'
          } else if( msg.payload[msg.payload.length-1] == 0x00 ) {
            newstate = 'off'
          } else {
            log('HANDLE', 'STATUS', 'Status unknown: ' +  msg.payload[msg.payload.length-1]);
          }
          if( newstate!=ghoma.state && newstate != 'unknown') {
            ghoma.prevstate = ghoma.state;
            ghoma.state = newstate;
            ghoma.statechanged = new Date();
            if( msg.payload[12] == 0x81 ) {
              ghoma.triggered = 'local';
            }else if( msg.payload[12] == 0x11 ) {
              ghoma.triggered = 'remote';
            } else {
              ghoma.triggered = 'unknown';
            }
            if( exports.onStatusChange ) {
              exports.onStatusChange(ghoma);
            }
          }
        } else if( msg.command.equals( CMD_HEARTBEAT ) ) {
          ghoma.lastheartbeat = new Date();
          if( exports.onHeartbeat ) {
            exports.onHeartbeat(ghoma);
          }
          send('HEARTBEAT RPLY', BuildMsg(HEARTBEATREPLY));
        } else {
          log('HANDLE','UNSUP CMD', msg.command );
        }
        msg=nextMsg();
      }
  });


  socket.on('close', function(data) {
    log('CLOSED', '');
    if( exports.onClose ) {
      exports.onClose(ghoma);
    }
    var idx = gHomaRegistry.indexOf(ghoma);
    if( idx!=-1 ) {
      gHomaRegistry.splice(idx,1);
    } else {
      log('WARN','CLOSENOREG');
    }
  });

  socket.on('error', function(err) {
    log('SCK ERR',err);
  });

  // Send msg via socket
  function send(msg, data) {
    log('SEND', msg, data);
    socket.write(data);
  }

  // Build and send on message
  function switchOn(){
    var onMsg = BuildMsg(
      Buffer.concat([
        new Buffer([0x10,0x01,0x01,0x0a,0xe0]),
        ghoma.triggercode,
        ghoma.shortMac,
        new Buffer([0xff,0xfe,0x00,0x00,0x10,0x11,0x00,0x00,0x01,0x00,0x00,0x00,0xff])
      ])
    );
    send('ON', onMsg);
  };

  // Build and send off message
  function switchOff(){
    var offMsg =BuildMsg(
      Buffer.concat([
        new Buffer([0x10,0x01,0x01,0x0a,0xe0]),
        ghoma.triggercode,
        ghoma.shortMac,
        new Buffer([0xff,0xfe,0x00,0x00,0x10,0x11,0x00,0x00,0x01,0x00,0x00,0x00,0x00])
      ])
    );
    send('OFF', offMsg);
  };

  // Extract next message from ghoma switch
  function nextMsg() {
    var msg = {};
    var prefixPos = buffer.indexOf(PREFIX);
    if( prefixPos!=-1 ) {
      if( prefixPos!=0 ) {
        throw Error("Prefix position not at 0.")
      }
      msg.length = buffer.readUIntBE(2,2);
      var postFixPos = buffer.indexOf(POSTFIX, 2);
      if( postFixPos!=-1 ) {
        msg.checksum = buffer.slice(postFixPos-1,postFixPos);
        msg.payload = buffer.slice(4, postFixPos-1);
        msg.command = msg.payload.slice(0,1);
        var sum = 0;
        for( i=0; i<msg.payload.length; i++) sum+=msg.payload[i];
        var checksum = new Buffer([0xFF - (sum & 255)]);

        if( msg.checksum[0]!=checksum[0]) {
          throw Error("Checksum error "+ msg.checksum[0] +" <> "+checksum[0]);
        }

        // Cut buffer
        buffer = buffer.slice(postFixPos+2);
        return msg;
      }
    }
  }

  function BuildMsg(payload) {
    // Calculate length from payload
    var length2Bytes= new Buffer([ payload.length >>> 8, payload.length & 255]);

    // Calculate checksum from payload
    var sum = 0;
    for( i=0; i<payload.length; i++) sum+=payload[i];
    var checksum = new Buffer([0xFF - (sum & 255)]);

    // Return concat result
    return Buffer.concat([
      PREFIX,
      length2Bytes,
      payload,
      checksum,
      POSTFIX
    ]);
  }

  function log(action, msg, data) {
    if( exports.log ) {
      if( data && msg ) {
        exports.log(pad(action_padding,action)+' ['+pad(msg_padding,msg)+'] '+ socket.remoteAddress + ' : ' + data.toString('hex'));
      } else {
        exports.log(pad(action_padding,action)+' ['+pad(msg_padding,msg)+'] '+ socket.remoteAddress);
      }
    }
  }

});

//
// Local helper functions
//

pad = function (pad, msg) { return (pad + msg).slice(-pad.length); }

log = function(action, msg) {
  if( exports.log ) {
    exports.log(pad(action_padding,'GHOMA')+' ['+pad(msg_padding,action)+'] '+msg);
  }
}

// Get plug by id
indexOfById = function(id) {
  var fid = -1;
  gHomaRegistry.forEach( function(ghoma,idx) {
    if( ghoma.id==id) {
      fid = idx;
    }
  });
  return fid;
}

// Return not the complete plug object
filterPlug = function(plug) {
  return {
    id : plug.id,
    state : plug.state,
    statechanged: plug.statechanged,
    triggered: plug.triggered,
    prevstate : plug.prevstate,
    initalized : plug.initalized,
    remoteAddress : plug.remoteAddress,
    remotePort : plug.remotePort,
    on : plug.on,
    off : plug.off,
    reregistered : plug.reregistered,
    heartbeat: plug.lastheartbeat
  }
}

/**
 * Iterator method, to go to each registered plug.
 *
 * @param callback will receive the ghoma objects as first parameter.
 */
exports.forEach = function(callback) {
  gHomaRegistry.forEach(function(plug) {
    callback(filterPlug(plug));
  });
}

/**
 * Get a ghoma plug by ident
 *
 * @param id The ident. The ident is compared to the hex representation of the short mac.
 */
exports.get = function(id) {
  var idx = indexOfById(id);
  return (idx!=-1 ? filterPlug(gHomaRegistry[idx]) : null);
}

/**
 * Start listening server.
 *
 * @param port The listening port. Must match the port configured for the plugs.
 * @param address Optional binding address.
 */
exports.startServer=function(port, address) {
  log('START','Control server start at '+new Date());

  // Create server socket
  server.listen(port, address);

  // Start the check timeer
  checkTimer = setInterval( function() {
    var now = new Date();
    log('CHECK',now);
    gHomaRegistry.forEach( function(plug) {
      var diff = now.getTime() - plug.lastheartbeat.getTime();
      if( diff > timeout ) {
        log('TIMEOUT', 'No hearbeat from ['+plug.id+'] in '+diff+' ms. Last hearbeat was ['+plug.lastheartbeat+'].');
        plug.socket.destroy();  // This should trigger close
      }
    });
  }, timeout );

}

/**
 * Shutdown the server.
 */
exports.shutdown=function() {
  log('SHUTDOWN','Control server shutdown at '+new Date());
  // Destroy each socket
  gHomaRegistry.forEach(function(plug) {
    plug.socket.destroy();
  });
  // Close server socket
  server.close();
  // Remove check timer
  clearInterval(checkTimer);
}
