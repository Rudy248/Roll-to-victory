'use strict';

// Socket.IO connection
const socket = io('https://roll-to-victory.onrender.com/');
let gameId = null;
let playerNumber = null;

//Selecting elements
const score0El = document.querySelector('#score--0');
const score1El = document.getElementById('score--1');
const diceEl = document.querySelector('.dice');
const btnNew = document.querySelector('.btn--new');
const btnRoll = document.querySelector('.btn--roll');
const btnHold = document.querySelector('.btn--hold');
const current0El = document.getElementById('current--0');
const current1El = document.getElementById('current--1');
const player0 = document.querySelector('.player--0');
const player1 = document.querySelector('.player--1');
const buttons = document.querySelectorAll('.btn');

const powerupBtn0 = document.getElementById('powerup-0');
const powerupBtn1 = document.getElementById('powerup-1');
const powerupBtn2 = document.getElementById('powerup-2');
const messageEl = document.getElementById('powerup-message');

const instructions = document.getElementById('instructions');
const startGameBtn = document.getElementById('start-game');
const game = document.getElementById('game');

// Multiplayer UI elements
const createGameBtn = document.getElementById('create-game');
const joinGameBtn = document.getElementById('join-game');
const gameIdInput = document.getElementById('game-id');
const gameIdDisplay = document.getElementById('game-id-display');

let scores = [0, 0];
let currentScores = [0, 0];
let activePlayer = 0;
let playing = false;
let powerupUsed = [false, false];

// Multiplayer event handlers
createGameBtn.addEventListener('click', () => {
  socket.emit('createGame');
});

joinGameBtn.addEventListener('click', () => {
  const inputGameId = gameIdInput.value.trim();
  if (inputGameId) {
    console.log('Attempting to join game:', inputGameId);
    gameId = inputGameId; // Store the gameId in the global variable
    socket.emit('joinGame', inputGameId);
  } else {
    alert('Please enter a game ID');
  }
});

// Socket event handlers
socket.on('gameCreated', id => {
  console.log('Game created with ID:', id);
  gameId = id;
  playerNumber = 0; // First player is always player 0
  gameIdDisplay.textContent = `Game ID: ${id}`;
  gameIdDisplay.classList.remove('hidden');
  displayMessage('Waiting for opponent to join...');
});

socket.on('gameStarted', gameState => {
  scores = gameState.scores;
  currentScores = gameState.currentScores;
  activePlayer = gameState.activePlayer;
  playing = true;
  powerupUsed = [false, false];

  // Determine player number based on socket ID position in the players array
  const playerIndex = gameState.players.indexOf(socket.id);
  if (playerIndex !== -1) {
    playerNumber = playerIndex;
  }
  console.log('Player number assigned:', playerNumber);

  updateUI();
  instructions.classList.add('hidden');
  game.classList.remove('hidden');
  displayMessage(`Game started! You are Player ${playerNumber + 1}`);
});

socket.on('diceRolled', data => {
  if (!playing) return;

  diceEl.classList.remove('hidden');
  diceEl.src = `dice-${data.dice}.png`;

  currentScores = data.currentScores;
  activePlayer = data.activePlayer;

  updateUI();

  if (data.dice === 1) {
    displayMessage('Rolled a 1! Turn lost.');
  }
});

socket.on('held', data => {
  if (!playing) return;

  scores = data.scores;
  currentScores = data.currentScores;
  activePlayer = data.activePlayer;

  updateUI();
  displayMessage('Score held!');
});

socket.on('powerupAvailable', player => {
  if (player === playerNumber) {
    const powerDiv = document.querySelector('.power');
    const overlayDiv = document.querySelector('.overlay');
    const gameButtons = document.querySelectorAll('.btn');

    // Show powerup UI
    powerDiv.classList.remove('hidden');
    overlayDiv.classList.remove('hidden');
    gameButtons.forEach(button => button.classList.add('hidden'));

    // Shuffle powerup positions
    const shuffledIndices = shuffle([0, 1, 2]);
    const powerupButtons = document.querySelectorAll('.powerup');

    // Clear powerup button content initially ('?')
    powerupButtons.forEach((button, index) => {
      const powerupIndex = shuffledIndices[index];
      button.innerHTML = '<i class="fa-solid fa-question"></i>';
      // On click, send powerup and reveal it
      button.onclick = () => {
        socket.emit('usePowerup', gameId, powerupIndex);
        hidePowerupUI();
      };
    });

    displayMessage('Power-up available! Choose a box to reveal your power-up');
  }
});

socket.on('powerupUsed', data => {
  scores = data.scores;
  currentScores = data.currentScores;

  // Update the UI with new scores
  score0El.textContent = scores[0];
  score1El.textContent = scores[1];
  current0El.textContent = currentScores[0];
  current1El.textContent = currentScores[1];

  // Add visual effects based on powerup type
  if (data.powerupIndex === 1) {
    // Flash animation for gaining points
    document
      .getElementById(`score--${data.playerIndex}`)
      .classList.add('flash');
    setTimeout(() => {
      document
        .getElementById(`score--${data.playerIndex}`)
        .classList.remove('flash');
    }, 500);
  } else if (data.powerupIndex === 2) {
    // Shake animation for losing points
    const opponentIndex = data.playerIndex === 0 ? 1 : 0;
    document.getElementById(`score--${opponentIndex}`).classList.add('shake');
    setTimeout(() => {
      document
        .getElementById(`score--${opponentIndex}`)
        .classList.remove('shake');
    }, 500);
  }

  // Show the powerup message
  displayMessage(data.message);
});

socket.on('gameOver', data => {
  playing = false;
  document
    .querySelector(`.player--${data.winner}`)
    .classList.add('player--winner');
  document
    .querySelector(`.player--${data.winner}`)
    .classList.remove('player--active');
  diceEl.classList.add('hidden');

  const winnerText = data.winner === playerNumber ? 'You won!' : 'You lost!';
  displayMessage(winnerText);
});

socket.on('playerDisconnected', playerIndex => {
  playing = false;
  alert(`Player ${playerIndex + 1} has disconnected. Game over.`);
  init();
});

socket.on('error', message => {
  console.log('Error received:', message);
  alert(message);
  // Reset the game ID input if there was an error
  if (message === 'Game not found' || message === 'Game is full') {
    gameIdInput.value = '';
  }
});

// Update UI function
function updateUI() {
  score0El.textContent = scores[0];
  score1El.textContent = scores[1];
  current0El.textContent = currentScores[0];
  current1El.textContent = currentScores[1];

  player0.classList.toggle('player--active', activePlayer === 0);
  player1.classList.toggle('player--active', activePlayer === 1);

  // Disable buttons if it's not the player's turn or game is not playing
  const isPlayerTurn = activePlayer === playerNumber;

  btnRoll.disabled = !playing || !isPlayerTurn;
  btnHold.disabled = !playing || !isPlayerTurn;

  // Update player labels based on player number
  if (playerNumber === 0) {
    document.getElementById('name--0').textContent = 'You';
    document.getElementById('name--1').textContent = 'Opponent';
  } else {
    document.getElementById('name--0').textContent = 'Opponent';
    document.getElementById('name--1').textContent = 'You';
  }
}

// Modified event handlers
btnRoll.addEventListener('click', function () {
  console.log(
    'Roll button clicked - Player:',
    playerNumber,
    'Active player:',
    activePlayer,
    'Playing:',
    playing
  );
  if (playing && activePlayer === playerNumber) {
    console.log(
      'Rolling dice - Player:',
      playerNumber,
      'Active player:',
      activePlayer
    );
    socket.emit('rollDice', gameId);
  } else {
    console.log(
      'Cannot roll - Player:',
      playerNumber,
      'Active player:',
      activePlayer,
      'Playing:',
      playing
    );
  }
});

btnHold.addEventListener('click', function () {
  console.log(
    'Hold button clicked - Player:',
    playerNumber,
    'Active player:',
    activePlayer,
    'Playing:',
    playing
  );
  if (playing && activePlayer === playerNumber) {
    console.log(
      'Holding score - Player:',
      playerNumber,
      'Active player:',
      activePlayer
    );
    socket.emit('hold', gameId);
  } else {
    console.log(
      'Cannot hold - Player:',
      playerNumber,
      'Active player:',
      activePlayer,
      'Playing:',
      playing
    );
  }
});

btnNew.addEventListener('click', init);

// Powerup functions
function ability0() {
  socket.emit('usePowerup', gameId, 0);
  hidePowerupUI();
}

function ability1() {
  socket.emit('usePowerup', gameId, 1);
  hidePowerupUI();
}

function ability2() {
  socket.emit('usePowerup', gameId, 2);
  hidePowerupUI();
}

function hidePowerupUI() {
  const powerDiv = document.querySelector('.power');
  const overlayDiv = document.querySelector('.overlay');
  const gameButtons = document.querySelectorAll('.btn');

  powerDiv.classList.add('hidden');
  overlayDiv.classList.add('hidden');
  gameButtons.forEach(button => button.classList.remove('hidden'));
}

function displayMessage(message) {
  const messageEl = document.getElementById('powerup-message');
  messageEl.textContent = message;
  messageEl.classList.remove('hidden');
  setTimeout(() => {
    messageEl.classList.add('hidden');
  }, 3000);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Initialize game
function init() {
  scores = [0, 0];
  currentScores = [0, 0];
  activePlayer = 0;
  playing = false;
  powerupUsed = [false, false];

  document.querySelector(`.player--0`).classList.remove('player--winner');
  document.querySelector(`.player--1`).classList.remove('player--winner');
  document.querySelector(`.player--0`).classList.add('player--active');
  document.querySelector(`.player--1`).classList.remove('player--active');

  diceEl.classList.add('hidden');
  score0El.textContent = 0;
  score1El.textContent = 0;
  current0El.textContent = 0;
  current1El.textContent = 0;

  // Reset multiplayer state
  gameId = null;
  playerNumber = null;
  gameIdDisplay.classList.add('hidden');
  gameIdInput.value = '';

  // Reset player labels
  document.getElementById('name--0').textContent = 'Player 1';
  document.getElementById('name--1').textContent = 'Player 2';

  // Show instructions
  instructions.classList.remove('hidden');
  game.classList.add('hidden');

  // Disable game buttons
  btnRoll.disabled = true;
  btnHold.disabled = true;
}

// Initialize the game
init();
