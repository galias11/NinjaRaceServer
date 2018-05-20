const dgram = require('dgram');


const server = dgram.createSocket('udp4');

server.on('listening', () => {
  console.log('UDP Server listening on ' + server.address().address + ':' + server.address().port);
})

server.on('message', (message, remote) => {
  const token = message.toString();

  var reply = new Buffer(JSON.stringify({
    token: token,
    email: 'player1@gmail.com',
    playerId: 10
  }));

  server.send(reply, 0, reply.length, remote.port, remote.address, (err, bytes) => {
    if(err) throw err;
    console.log("reply send");
  })
})

server.bind(1337);
