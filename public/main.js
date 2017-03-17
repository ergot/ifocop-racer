var socket = io.connect('http://localhost:3000');

var flagKeydown = true;

function step(flagKeydown){
  window.addEventListener("keydown", function(e){
    if (flagKeydown && e.keyCode == 32) {
      console.log(e.keyCode);
      socket.emit('trackMove', '+1');
      flagKeydown = false;
    }
  });
  window.addEventListener("keyup", function(e){

    if (!flagKeydown && e.keyCode == 32) {
      flagKeydown = true;
    }
  });
}


window.addEventListener('load', function (){
  //form
  var form = document.getElementsByTagName('form')[0];
  var formMessage = document.getElementById('formMessage');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    formMessage.innerText = '';
    var inputSpeudo = document.getElementById('speudo').value;
    socket.emit('newPseudo', inputSpeudo);
  });

  socket.on('newPseudo', function (message) {
    switch (message.code) {
      case 401:
        formMessage.innerHTML = message.message;
        console.log(message.message);
        break;
      case 451:
        formMessage.innerHTML = message.message;
        console.log(message.message);
        break;
      case 200:
        form.style.display='none';
        document.getElementById('table').style.visibility='visible';
        console.log(message.message);
        break;
    }
  });

  socket.on('track', function (message) {

    switch (message.code)    {
      case 503:
        document.getElementById('trackInfo').innerHTML=message.message;
        break;
      case 404:
        document.getElementById('trackInfo').innerHTML=message.message;
        document.getElementsByClassName('row-player1')[0].style.visibility='visible';
        document.getElementsByClassName('playerSpeudo1')[0].textContent=message.speudo1;
        break;
      case 200:
        document.getElementById('trackInfo').innerHTML=message.message;
        document.getElementsByClassName('row-player1')[0].style.visibility='visible';
        document.getElementsByClassName('row-player2')[0].style.visibility='visible';
        document.getElementsByClassName('playerSpeudo1')[0].textContent=message.speudo1;
        document.getElementsByClassName('playerSpeudo2')[0].textContent=message.speudo2;
        //step(flagKeydown);
        break;
      case 202:
        document.getElementById('trackInfo').innerHTML=message.message;
        document.getElementsByClassName('row-player2')[0].style.visibility='visible';
        document.getElementsByClassName('playerSpeudo2')[0].textContent=message.speudo2;
        //step(flagKeydown);
        break;
    }

  });

  socket.on('trackMove', function (message) {
    if (message.px1) {
      var witdhDiv = document.getElementsByClassName('row-player1')[0].clientWidth;

      var newPx = message.px1*witdhDiv;
      document.getElementsByClassName('trackMove1')[0].style.marginLeft=newPx+'px';
    }

    if (message.px2) {
      var witdhDiv = document.getElementsByClassName('row-player1')[0].clientWidth;
      var newPx = message.px2*witdhDiv;

      document.getElementsByClassName('trackMove2')[0].style.marginLeft=newPx+'px';
    }
  });

  socket.on('scoreboard', function (players) {

    document.getElementById('scoreboard').innerHTML = "";

    var render = `<thead>
                            <tr>
                                <th>Pseudo</th>
                                <th>Score</th>
                                <th>Durée</th>
                            </tr>
                           </thead>`;

    render += '<tbody>';

    players.forEach(function(player) {

      var template = `<tr>
                                <td>${player.speudo}</td>
                                <td>${player.score}</td>
                                 <td>${player.time/1000} s</td>
                              </tr>`;

      render += template;

    });
    render += '</tbody>';

    document.getElementById('scoreboard').innerHTML = render;

  });

  socket.on('information', function(message){
    document.getElementById('information').innerHTML=message;
  });

  socket.on('crebour', function(message) {
    console.log(message);
    document.getElementById('trackInfo').innerHTML=message;
  });

  socket.on('runForest', function(message) {
    step(flagKeydown);
  });

  //change img when loose or winid='player1
  socket.on('img', function(message) {
    document.getElementById(message.player).src = message.img+"-128.png";

  });
})

