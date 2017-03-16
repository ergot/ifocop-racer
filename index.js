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
  speudo: String,
  time: {type:Number, default:0},
  score: {type:Number, default:0}
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

var speudoBag = {
  bag: [],
  add: function (speudo) {
    this.bag.push(speudo);
  },
  remove: function (speudo) {
    var index = this.bag.indexOf(speudo);
    if (index > -1) this.bag.splice(index, 1);
  },
  competitor: function (speudo) {
    return this.bag.filter(function(element){
      return (element != speudo)
    })[0];
  }
};

var defaultSpeed = 10;
var defaultTrackLength = 100;
var hasWinner = false;

io.sockets.on('connection', function (socket) {

  console.log('Un client est connecté !');
  var playerPositionInTrack = 0;
  var dateStart = 0;
  var dateEnd = 0;

  socket.on('newPseudo', function (speudo) {

    console.log(speudoBag.bag);

    if (speudoBag.bag.length > 1) {
      socket.emit('track', {code:503, message: `<div class="text-center"><h3>La room est plein, merci de revenir plus tard et de rafraichir la page</h3></div>`});
      socket.disconnect();
      console.log('client deconnecter');
      return;
    }

    //var response = {code:'', message: ''};
    speudo = speudo.trim();
    //speudo vide ou blank
    if (speudo == 0) {
      console.log('chaine vide');
      socket.emit('newPseudo', {code: 401, message: '<p class="alert alert-danger"> pseudo vide</p>'});
      return;
    }

    //speudo deja utiliser || new speudo
    Player.count({ 'speudo': speudo }, function (err, count) {
      if (err) return handleError(err);

      if(count > 0) {
        socket.emit('newPseudo', {code: 451, message: '<p class="alert alert-danger"> pseudo deja pris</p>'});
      } else {

        Player.find({}).sort({'_id': -1}).exec(function(err,player) {
          if (err) return console.error(err);
          //console.log(player);
          io.emit('scoreboard', player);
        });

        var player = new Player({ speudo: speudo });

        player.save(function (err) {
          if (err) return handleError(err);
          socket.emit('newPseudo', {code:200, message:'nouveau speudo'});

          speudoBag.add(player.speudo);

          if (speudoBag.bag.length === 1) {

            socket.emit('track', {
              code:404,
              message: 'en attente d un autre joueurs',
              speudo1: player.speudo
            });

          }
          if (speudoBag.bag.length === 2) {

            socket.emit('track', {
              code:200,
              message: 'la partie peut commencer quand vous voulez, appuyer sur la barre espace pour faire avancer votre avatar',
              speudo1: player.speudo,
              speudo2: speudoBag.competitor(player.speudo)
              //speudo2: 'speduo2'
            });

            //updarte player 1
            socket.broadcast.emit('track', {
              code: 202,
              message: 'la partie peut commencer quand vous voulez, appuyer sur la barre espace pour faire avancer votre avatar',
              speudo2: player.speudo
            });
          }

          socket.on('trackMove', function (message) {

            playerPositionInTrack += defaultSpeed;
            var pxInP = playerPositionInTrack/defaultTrackLength;
            if (pxInP <= 1) socket.emit('trackMove', {px1:pxInP});
            if (pxInP <= 1) socket.broadcast.emit('trackMove', {px2:pxInP});

            if (dateStart == 0) dateStart = new Date();
            if ( pxInP >= 1 &&  dateEnd == 0) {
              dateEnd =  new Date() - dateStart;
              console.log(`fin de la game en: ${dateEnd} pour ${player.speudo}`);

              if (!hasWinner) {
                hasWinner = true;
                player.score += 1;
              } else {
                hasWinner = false;
              }

              player.time += dateEnd;

              player.save(function (err) {
                if (err) return console.error(err);
                console.log('player save run time');

                Player.find({}).sort({'_id': -1}).exec(function(err,player) {
                  if (err) return console.error(err);
                  console.log(player);
                  io.emit('scoreboard', player);
                });
              });
            }
          });

          socket.on('disconnect', function() {
            speudoBag.remove(player.speudo);
          })

        });
      }
    });
  });
});

server.listen(3000);
