const players = {}
const characters = ["mustafa", "ihsan"];

function WebGLTexture() { }

const config = {
  type: Phaser.HEADLESS,
  parent: 'phaser-example',
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 500 }
    }
  },
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

  game.players = this.physics.add.group();
  game.physics.add.collider(game.players);

  io.on('connection', function (socket) {
    console.log('User ('+socket.id+') connected.');

    players[socket.id] = {
      direction: 'right',
      x: randomPosition(50, 700),
      y: 300,
      anim: 'idle',
      playerId: socket.id,
      character: randomCharacter(),
      input: {
        left: false,
        right: false,
        up: false
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
    // Add the platform layer as a static group, the player would be able
    // to jump on platforms like world collisions but they shouldn't move
    const platforms = map.createStaticLayer('Platforms', tileset, 0, 200);
    // There are many ways to set collision between tiles and players
    // As we want players to collide with all of the platforms, we tell Phaser to
    // set collisions for every tile in our platform layer whose index isn't -1.
    // Tiled indices can only be >= 0, therefore we are colliding with all of
    // the platform layer
    platforms.setCollisionByExclusion(-1, true);

    addPlayer(game, players[socket.id], platforms);

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

    socket.on('playerInput', function (inputData) {
      handlePlayerInput(game, socket.id, inputData);
    });
  });


}

function update() {
  this.players.getChildren().forEach((player) => {
    let id = player.playerId;
    let anim = 'idle';
    const input = players[id].input;
    if (input.left) {
      //player.setVelocityX(-200);
      if (player.body.onFloor()) {
        anim = 'walk';
      }
    } else if (input.right) {
      //player.setVelocityX(200);
      if (player.body.onFloor()) {
        anim = 'walk';
      }
    } else {
      player.setVelocityX(0);
    }

    if (input.up && player.body.onFloor()) {
      player.setVelocityY(-350);
      anim = 'jump';
    }

    players[id].x = player.x;
    players[id].y = player.y;
    players[id].direction = player.body.velocity.x < 0 ? 'left' : 'right';
    players[id].anim = anim;
  });

  io.emit('playerUpdates', players);
}

function randomPosition(min, max) {
  return Math.floor(Math.random() * max) + min;
}

function randomCharacter() {
  return characters[randomPosition(0,2)];
}

function addPlayer(game, playerInfo, platforms) {
  const player = game.physics.add.sprite(playerInfo.x, playerInfo.y, playerInfo.character);
  player.setOrigin(playerInfo.x, playerInfo.y);
  player.setDisplaySize(53, 40);
  player.setBounce(0.1); // our player will bounce from items
  player.setCollideWorldBounds(true); // don't go out of the map
  game.physics.add.collider(player, platforms);
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
