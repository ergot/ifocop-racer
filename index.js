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

  if (io.engine.clientsCount > 2) {
    socket.emit('track', {code:503, message: 'limit de joueur atteint'});
    socket.disconnect();
    console.log('client deconnecter');
  }

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

    //speudo deja utiliser || new speudo
    Player.count({ 'speudo': speudo }, function (err, count) {
      if (err) return handleError(err);

      if(count > 0) {
        response.code = 451;
        response.message = 'speudo deja pris';
        socket.emit('newPseudo', response);
      }else{

        var player = new Player({ speudo: speudo });
        player.save(function (err) {
          if (err) return handleError(err);
          response.code = 200;
          response.message = 'nouveau speudo';
          socket.emit('newPseudo', response);

          if (io.engine.clientsCount === 1) socket.emit('track', {code:404, message: 'en attente d un autre joueurs'});
          if (io.engine.clientsCount === 2) {
            io.sockets.emit('track', {code:200, message: 'la partie peut commencer quand vous voulez, appuyer sur la barre espace pour faire avancer votre avatar'});
          }
        });
      }
    });
  });
});

server.listen(3000);
