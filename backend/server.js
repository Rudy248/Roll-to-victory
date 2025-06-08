const express = require('express');
const app = express();
const http = require('http').createServer(app);
const cors = require('cors');

app.use(
  cors({
    origin: 'https://main--roll-to-victory.netlify.app/', // <-- Replace with your actual Netlify URL
    methods: ['GET', 'POST'],
  })
);

const io = require('socket.io')(http, {
  cors: {
    origin: 'https://main--roll-to-victory.netlify.app/', // <-- Replace with your actual Netlify URL
    methods: ['GET', 'POST'],
  },
});

// Store active games
const games = new Map();

io.on('connection', socket => {
  // Handle game creation
  socket.on('createGame', () => {
    const gameId = Math.random().toString(36).substring(2, 8);
    games.set(gameId, {
      players: [socket.id],
      scores: [0, 0],
      currentScores: [0, 0],
      activePlayer: 0,
      powerupUsed: [false, false],
    });

    socket.join(gameId);
    socket.emit('gameCreated', gameId);
  });

  // Handle joining game
  socket.on('joinGame', gameId => {
    const game = games.get(gameId);

    if (!game) {
      socket.emit('error', 'Game not found');
      return;
    }

    if (game.players.length >= 2) {
      socket.emit('error', 'Game is full');
      return;
    }

    // Add player to game
    game.players.push(socket.id);
    socket.join(gameId);

    // Start the game immediately when second player joins
    io.to(gameId).emit('gameStarted', {
      scores: game.scores,
      currentScores: game.currentScores,
      activePlayer: game.activePlayer,
      players: game.players,
    });
  });

  // Handle dice roll
  socket.on('rollDice', gameId => {
    const game = games.get(gameId);
    if (!game) {
      return;
    }

    const playerIndex = game.players.indexOf(socket.id);

    if (playerIndex !== game.activePlayer) {
      return;
    }

    const dice = Math.trunc(Math.random() * 6) + 1;

    if (dice === 1) {
      game.currentScores[game.activePlayer] = 0;
      game.activePlayer = game.activePlayer === 0 ? 1 : 0;
    } else {
      game.currentScores[game.activePlayer] += dice;
    }

    io.to(gameId).emit('diceRolled', {
      dice,
      currentScores: game.currentScores,
      activePlayer: game.activePlayer,
    });
  });

  // Handle hold
  socket.on('hold', gameId => {
    const game = games.get(gameId);
    if (!game) {
      return;
    }

    const playerIndex = game.players.indexOf(socket.id);

    if (playerIndex !== game.activePlayer) {
      return;
    }

    // Add current score to total score
    game.scores[game.activePlayer] += game.currentScores[game.activePlayer];
    game.currentScores[game.activePlayer] = 0;

    // Check for powerup activation (score >= 30) only after holding
    if (
      game.scores[game.activePlayer] >= 30 &&
      !game.powerupUsed[game.activePlayer]
    ) {
      io.to(game.players[game.activePlayer]).emit(
        'powerupAvailable',
        game.activePlayer
      );
    }

    // Check for winner
    if (game.scores[game.activePlayer] >= 100) {
      io.to(gameId).emit('gameOver', {
        winner: game.activePlayer,
        scores: game.scores,
      });
      games.delete(gameId);
      return;
    }

    // Switch active player
    game.activePlayer = game.activePlayer === 0 ? 1 : 0;

    io.to(gameId).emit('held', {
      scores: game.scores,
      currentScores: game.currentScores,
      activePlayer: game.activePlayer,
    });
  });

  // Handle powerup use
  socket.on('usePowerup', (gameId, powerupIndex) => {
    const game = games.get(gameId);
    if (!game) {
      return;
    }

    const playerIndex = game.players.indexOf(socket.id);
    if (playerIndex === -1) {
      return;
    }

    // Check if player has already used their powerup
    if (game.powerupUsed[playerIndex]) {
      return;
    }

    // Apply powerup effects
    let powerupMessage = '';
    if (powerupIndex === 0) {
      // Better luck next time - no effect
      powerupMessage = 'Better luck next time! No effect.';
    } else if (powerupIndex === 1) {
      // Active player gains 10 points
      game.scores[playerIndex] += 10;
      powerupMessage = 'You gained 10 points!';
    } else if (powerupIndex === 2) {
      // Opponent loses 10 points
      const opponentIndex = playerIndex === 0 ? 1 : 0;
      game.scores[opponentIndex] = Math.max(0, game.scores[opponentIndex] - 10);
      powerupMessage = 'Opponent lost 10 points!';
    }

    // Mark powerup as used for this player
    game.powerupUsed[playerIndex] = true;

    // Check for winner after powerup effect
    if (game.scores[playerIndex] >= 100) {
      io.to(gameId).emit('gameOver', {
        winner: playerIndex,
        scores: game.scores,
      });
      games.delete(gameId);
      return;
    }

    // Emit powerup used event with updated scores to all players
    io.to(gameId).emit('powerupUsed', {
      scores: game.scores,
      currentScores: game.currentScores,
      powerupIndex,
      playerIndex,
      message: powerupMessage,
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    // Find and clean up the game
    for (const [gameId, game] of games.entries()) {
      const playerIndex = game.players.indexOf(socket.id);
      if (playerIndex !== -1) {
        io.to(gameId).emit('playerDisconnected', playerIndex);
        games.delete(gameId);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
