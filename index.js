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


// Routing
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.sockets.on('connection', function (socket) {

  console.log('Un client est connecté !');

  socket.on('newPseudo', function (speudo) {
    var response = {code:'', message: ''};
    speudo = speudo.trim();
    //speudo vide ou blank
    if (!speudo) {
      console.log('chaine vide');
      response.code = 401;
      response.message = 'speudo vide';
      socket.emit('newPseudo', response);
    }

    //speudo deja utiliser
    Player.count({ 'speudo': speudo }, function (err, count) {
      if (err) return handleError(err);
      console.log('there are %d player', count);

      if(count > 0) {
        response.code = 451;
        response.message = 'speudo deja pris';
        socket.emit('newPseudo', response);
      }else{
        response.code = 200;
        response.message = 'nouveau speudo';
        socket.emit('newPseudo', response);
      }

    });


    //speudo ok

    //debug
    console.log('on.newspeudo:'+speudo);
  });

});


server.listen(3000);
