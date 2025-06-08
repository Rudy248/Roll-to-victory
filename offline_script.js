'use strict';

//Selecting elements
const score0El = document.querySelector('#score--0');
const score1El = document.getElementById('score--1'); //only works for id
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

let scores;
let currentScore;
let activePlayer;
let playing;
let powerupUsed;

startGameBtn.addEventListener('click', function () {
  // Hide the instruction page and show the game
  instructions.classList.add('hidden');
  game.classList.remove('hidden');
});

const init = function () {
  // while (!player1Name) {
  //   var player1Name = prompt('Enter player 1 name: ');
  // }
  // while (!player2Name) {
  //   var player2Name = prompt('Enter player 2 name: ');
  // }

  // document.getElementById('name--0').textContent = player1Name;
  // document.getElementById('name--1').textContent = player2Name;
  document.querySelector(`.player--0`).classList.remove('player--winner');
  document.querySelector(`.player--1`).classList.remove('player--winner');
  document.querySelector(`.player--0`).classList.add('player--active');
  document.querySelector(`.player--1`).classList.remove('player--active');
  activePlayer = 0;
  currentScore = 0;
  playing = true;
  scores = [0, 0];
  powerupUsed = [false, false]; // Track if power-up has been used by each player
  diceEl.classList.add('hidden');
  score0El.textContent = 0;
  score1El.textContent = 0;
  current0El.textContent = 0;
  current1El.textContent = 0;
};

// document.addEventListener('DOMContentLoaded', function () {
//   // Function to move buttons outside of the main block
//   function moveButtonsOutsideMain() {
//     const main = document.querySelector('main');

//     // Check if the screen width is less than or equal to 768px
//     if (window.innerWidth <= 768) {
//       buttons.forEach(button => {
//         main.parentNode.insertBefore(button, main.nextSibling);
//       });
//     } else {
//       // Revert buttons back inside the main block for larger screens
//       buttons.forEach(button => {
//         main.appendChild(button);
//         // Revert styles to default
//       });
//     }
//   }

//   // Run on page load
//   moveButtonsOutsideMain();

//   // Add event listener to handle window resizing
//   window.addEventListener('resize', moveButtonsOutsideMain);
// });

//powerup
const togglePowerup = function () {
  document.querySelector('.power').classList.toggle('hidden');
  document.querySelector('.overlay').classList.toggle('hidden');
  console.log(buttons);
  if (document.querySelector('.power').classList.contains('hidden')) {
    // If the power-up section is hidden, show the buttons
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].classList.remove('hidden');
    }
  } else {
    // If the power-up section is visible, hide the buttons
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].classList.add('hidden');
    }
  }
};

function ability0() {
  let ability = scores[activePlayer] + 10;
  scores[activePlayer] = ability;
  document.getElementById(`score--${activePlayer}`).textContent =
    scores[activePlayer];

  document.getElementById(`score--${activePlayer}`).classList.add('flash');
  setTimeout(() => score0El.classList.remove('flash'), 500);

  displayMessage('You gained 10 points!');
}

function ability1() {
  let opponentPlayer = activePlayer === 0 ? 1 : 0;
  let ability = scores[opponentPlayer] - 10;
  scores[opponentPlayer] = ability;
  document.getElementById(`score--${opponentPlayer}`).textContent =
    scores[opponentPlayer];

  document.getElementById(`score--${opponentPlayer}`).classList.add('shake');
  setTimeout(() => opponentScoreEl.classList.remove('shake'), 500);

  displayMessage('Your opponent lost 10 points!');
}

function ability2() {
  displayMessage('Better luck next time!');
}

function displayMessage(message) {
  messageEl.textContent = message;
  messageEl.classList.remove('hidden');

  // Optionally, hide the message after a few seconds
  setTimeout(() => {
    messageEl.classList.add('hidden');
  }, 2000);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Function to assign power-ups to buttons
function assignPowerups() {
  const powerups = [ability0, ability1, ability2];
  shuffle(powerups);

  powerupBtn0.onclick = function () {
    powerups[0]();
    togglePowerup();
    switchPlayer();
  };

  powerupBtn1.onclick = function () {
    powerups[1]();
    togglePowerup();
    switchPlayer();
  };

  powerupBtn2.onclick = function () {
    powerups[2]();
    togglePowerup();
    switchPlayer();
  };
}
init();

const switchPlayer = function () {
  document.getElementById(`current--${activePlayer}`).textContent = 0;
  currentScore = 0;
  activePlayer = activePlayer === 0 ? 1 : 0;
  player0.classList.toggle('player--active');
  player1.classList.toggle('player--active');
  for (let i = 0; i < buttons.length; i++) {
    buttons[i].classList.remove('hidden');
  }
};

//Rolling dice function
btnRoll.addEventListener('click', function () {
  if (playing) {
    //1. Generate a random dice roll
    const dice = Math.trunc(Math.random() * 6) + 1;

    //2. Display dice
    diceEl.classList.remove('hidden');
    diceEl.src = `dice-${dice}.png`;

    //3. Check for rolled 1: if true switch player
    if (dice !== 1) {
      currentScore += dice;
      document.getElementById(`current--${activePlayer}`).textContent =
        currentScore;
    } else {
      switchPlayer();
    }
  }
});

btnHold.addEventListener('click', function () {
  if (playing) {
    // 1. Add current score to active players scores
    scores[activePlayer] += currentScore;
    document.getElementById(`score--${activePlayer}`).textContent =
      scores[activePlayer];

    // implementing powerup
    if (scores[activePlayer] >= 30 && !powerupUsed[activePlayer]) {
      assignPowerups();
      togglePowerup();
      powerupUsed[activePlayer] = true;
    }

    //2. Check if playes score is >= 100
    else if (scores[activePlayer] >= 100) {
      playing = false;
      document
        .querySelector(`.player--${activePlayer}`)
        .classList.add('player--winner');
      document
        .querySelector(`.player--${activePlayer}`)
        .classList.remove('player--activer');
      diceEl.classList.add('hidden');
    } else {
      //3. switch to next player
      switchPlayer();
    }
  }
});

btnNew.addEventListener('click', init);
