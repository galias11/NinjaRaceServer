var net = require('net');

var server = net.createServer(function(socket) {
  console.log("recived data");
	socket.write('Echo server\r\n');
});

server.listen(1337);
