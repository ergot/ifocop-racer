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
var timeWinner = 0;


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
              message: `<div class="text-center"><h5>En attente d un autre joueurs</h5></div>`,
              speudo1: player.speudo
            });

          }
          if (speudoBag.bag.length === 2) {

            socket.emit('track', {
              code:200,
              message: '<div class="text-center"><h5>La partie peut commencer quand vous voulez, appuyer sur la barre espace pour faire avancer votre avatar</h5></div>',
              speudo1: player.speudo,
              speudo2: speudoBag.competitor(player.speudo)
            });

            //updarte player 1
            socket.broadcast.emit('track', {
              code: 202,
              message: '<div class="text-center"><h5>La partie peut commencer quand vous voulez, appuyer sur la barre espace pour faire avancer votre avatar</h5></div>',
              speudo2: player.speudo
            });

              var compte = 10;

              console.log('titac '+compte);
              io.emit('crebour', `<div class="text-center"><h2>${compte}</h2></div>`);

              var id = setInterval(function(socket){
                compte--;
                console.log('titac '+compte);
                io.emit('crebour', `<div class="text-center"><h2>${compte}</h2></div>`);
                if (compte == 0) {
                  io.emit('crebour', `<div class="text-center"><h2>RUN</h2></div>`);
                  io.emit('runForest', 'run');
                  clearInterval(id);
                }
              }, 1000, socket);

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
                socket.emit('img', {player: 'player1', img: 'win'});
                socket.broadcast.emit('img',{player: 'player2', img: 'win'} );

                timeWinner = dateEnd;
                hasWinner = true;
                player.score += 1;
                var message = `<div class="alert alert-success" role="alert">
                  Tu as gagné en ${dateEnd/1000} s
                </div>`;
                socket.emit('information', message);

              } else {
                socket.emit('img', {player: 'player1', img: 'loose'});
                socket.broadcast.emit('img',{player: 'player2', img: 'loose'} );
                hasWinner = false;

                var message = `<div class="alert alert-danger" role="alert">
                  Tu as perdu de ${(dateEnd-timeWinner)/1000}s
                </div>`;
                socket.emit('information', message);
                timeWinner = 0;
              }

              player.time += dateEnd;

              player.save(function (err) {
                if (err) return console.error(err);
                console.log('player save run time');

                Player.find({}).sort({'_id': -1}).exec(function(err,player) {
                  if (err) return console.error(err);
                  //console.log(player);
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
