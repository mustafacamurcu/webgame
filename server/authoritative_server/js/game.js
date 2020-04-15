const players = {}
const characters = ["mustafa", "ihsan"];

function WebGLTexture() { }

const config = {
  type: Phaser.HEADLESS,
  parent: 'phaser-example',
  width: 800,
  height: 600,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  autoFocus: false,
};

function preload() {
  // Image layers from Tiled can't be exported to Phaser 3 (as yet)
  // So we add the background image separately
  this.load.image('background', 'assets/images/background.png');
  // Load the tileset image file, needed for the map to know what
  // tiles to draw on the screen
  this.load.image('tiles', 'assets/tilesets/platformPack_tilesheet.png');
  // Even though we load the tilesheet with the spike image, we need to
  // load the Spike image separately for Phaser 3 to render it
  this.load.image('spike', 'assets/images/spike.png');
  // Load the export Tiled JSON
  this.load.tilemapTiledJSON('map', 'assets/tilemaps/level1.json');
  // Load player animations from the player spritesheet and atlas JSON
  this.load.atlas('mustafa', 'assets/images/kenney_player.png',
    'assets/images/kenney_player_atlas.json');
  this.load.atlas('ihsan', 'assets/images/kenney_player.png',
    'assets/images/kenney_player_atlas.json');
}

function create() {
  const game = this;

  game.players = this.add.group();

  io.on('connection', function (socket) {
    console.log('User ('+socket.id+') connected.');

    players[socket.id] = {
      direction: 'right',
      x: randomPosition(2, 5)*32,
      y: 4*32,
      anim: 'idle',
      playerId: socket.id,
      character: randomCharacter(),
      input: {
        left: false,
        right: false,
        up: false,
        down: false,
        space: false
      }
    };

    // Create a tile map, which is used to bring our level in Tiled
    // to our game world in Phaser
    const map = game.make.tilemap({ key: 'map' });
    // Add the tileset to the map so the images would load correctly in Phaser
    const tileset = map.addTilesetImage('kenney_simple_platformer', 'tiles');
    // Place the background image in our game world
    const backgroundImage = game.add.image(0, 0, 'background').setOrigin(0, 0);
    // Scale the image to better match our game's resolution
    backgroundImage.setScale(2, 0.8);

    addPlayer(game, players[socket.id]);

    // send the players object to the new player
    socket.emit('currentPlayers', players);
    // update all other players of the new player
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.on('disconnect', function () {
      console.log('User ('+socket.id+') disconnected.');
      // emit a message to all players to remove this player
      removePlayer(game, socket.id);
      io.emit('disconnect', socket.id);
      delete players[socket.id];
    });

    socket.on('playerInput', function (input) {
      game.players.getChildren().forEach((player) => {
        let id = socket.id;
        if (input.space) {
          players[id].direction = 'stop';
        } else if (input.left) {
          players[id].direction = 'left';
        } else if (input.right) {
          players[id].direction = 'right';
        } else if (input.up) {
          players[id].direction = 'up';
        } else if (input.down) {
          players[id].direction = 'down';
        }
      });
    });
  });

  //tick
  setInterval(() => {
    this.players.getChildren().forEach((player) => {
      let id = player.playerId;
      let dir = players[id].direction;
      if (dir == 'stop') {
        player.x += 0;
      } else if (dir == 'left') {
        player.x -= 32;
      } else if (dir == 'right') {
        player.x += 32;
      } else if (dir == 'up') {
        player.y -= 32;
      } else if (dir == 'down') {
        player.y += 32;
      }
      players[id].x = player.x;
      players[id].y = player.y;
      players[id].anim = 'idle';
    });
  }, 1000);
}

function update() {
  io.emit('playerUpdates', players);
}


function randomPosition(min, max) {
  return Math.floor(Math.random() * max) + min;
}

function randomCharacter() {
  return characters[randomPosition(0,2)];
}

function addPlayer(game, playerInfo) {
  const player = game.add.sprite(playerInfo.x, playerInfo.y, playerInfo.character);
  player.setOrigin(playerInfo.x, playerInfo.y);
  player.setDisplaySize(53, 40);
  player.playerId = playerInfo.playerId;
  game.players.add(player);
}

function removePlayer(game, playerId) {
  game.players.getChildren().forEach((player) => {
    if (playerId === player.playerId) {
      player.destroy();
    }
  });
}

function handlePlayerInput(game, playerId, input) {

  game.players.getChildren().forEach((player) => {
    if (playerId === player.playerId) {
      players[player.playerId].input = input;
    }
  });
}

const Game = new Phaser.Game(config);

window.gameLoaded();
