/**
 * Utility programm to change the control server of a G-Homa plug.
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
var initDone = false;
var messagesReceive = [];
var configHandler = function () {
};
var log = function () {

};

var client = dgram.createSocket("udp4");

function send(message) {
    log('SEND      : ' + message);
    client.send(message, 0, message.length, 48899, gHomaAddress);
}

function close() {
    log('CLOSING');
    messagesReceive = [];
    initDone = false;
    gHomaAddress = undefined;
    controlPort = undefined;
    controlServer = undefined;
    client.close();
}

client.on('listening', function () {
    var address = client.address();
    log('LISTENING : ' + address.address + ":" + address.port);
});

client.on('error', function (err) {
    log('ERROR     : ' + err);
    close();
    configHandler(err);
});

client.on('message', function (message, remote) {
    log('RECEIVE   : ' + message);
    if (initDone) {
        messagesReceive.push(new String(message).trim());
        if (messagesReceive.length === 3 && messagesReceive[0] !== '+ERR=-1' || messagesReceive.length === 4) {
            const mess = messagesReceive[messagesReceive.length - 1];
            const parts = messagesReceive[messagesReceive.length - 1].split(',');
            if (parts[parts.length - 1] === controlServer && parts[parts.length - 2] === controlPort + '') {
                log('Finish success : ' + mess);
                configHandler(null);
            }
            else {
                log('Finish error : ' + mess);
                configHandler(mess);
            }
            close();
        }
    } else {
        initDone = true;
        send(new Buffer("+ok"));        // Reply to first received data
        //send(new Buffer("AT+H\r"));   // Uncomment to see the help page
        send(new Buffer("AT+VER\r"));   // Request the version
        send(new Buffer("AT+NETP=TCP,Client," + controlPort + "," + controlServer + "\r"));   // Send new network parameter
        send(new Buffer("AT+NETP\r"));  // See the new settings
    }
});

if (gHomaAddress && controlServer && controlPort) {
    log = console.log;
    send(helloMessage);
}

module.exports = {
    configure: function (plugAddress, newHost, port, handler, logger) {
        gHomaAddress = plugAddress;
        controlServer = newHost;
        controlPort = port;
        if (handler) {
            configHandler = handler;
        }
        if (logger) {
            log = logger;
        }
        send(helloMessage);
    },
    restore: function (plugAddress, handler, logger) {
        log = logger;
        gHomaAddress = plugAddress;
        controlServer = 'plug.g-homa.com';
        controlPort = 4196;
        if (handler) {
            configHandler = handler;
        }
        if (logger) {
            log = logger;
        }
        send(helloMessage);
    }
}