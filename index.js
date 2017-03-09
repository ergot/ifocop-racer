var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var mongoose = require('mongoose');

// config
app.use(express.static('./public'));
mongoose.connect('mongodb://localhost/racer');

//database player schema
var playerSchema = mongoose.Schema({
  speudo: String
});
//database player model
var Player = mongoose.model('Player', playerSchema);

var player1 = new Player({speudo: "player1"});

player1.save(function (err, player1) {
  if (err) return console.error(err);
  console.log('save player1');
});



// database
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
  console.log('connection a la base');
});


app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.sockets.on('connection', function (socket) {

  console.log('Un client est connecté !');

  socket.on('newPseudo', function (message) {
    console.log('Un client me parle ! Il me dit : ' + message);
  });

});


server.listen(3000);
