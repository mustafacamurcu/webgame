var config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 800,
  heigth: 640,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

var Game = new Phaser.Game(config);

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
  var game = this;

  this.socket = io();
  this.players = this.add.group();

  this.socket.on('currentPlayers', function (players) {
    Object.values(players).forEach(playerInfo => addPlayer(game, playerInfo));
  });

  this.socket.on('newPlayer', playerInfo => addPlayer(game, playerInfo));

  this.socket.on('disconnect', function (playerId) {
    game.players.getChildren().forEach(function (player) {
      if (playerId === player.playerId) {
        player.destroy();
      }
    });
  });

  this.socket.on('playerUpdates', function (players) {
    Object.keys(players).forEach(function (id) {
      game.players.getChildren().forEach(function (player) {
        if (players[id].playerId === player.playerId) {
          player.setPosition(players[id].x, players[id].y);
          player.setFlipX(players[id].direction == 'left');
          player.play(players[id].anim, true);
        }
      });
    });
  });

  // Create a tile map, which is used to bring our level in Tiled
  // to our game world in Phaser
  const map = this.make.tilemap({ key: 'map' });
  // Add the tileset to the map so the images would load correctly in Phaser
  const tileset = map.addTilesetImage('kenney_simple_platformer', 'tiles');
  // Place the background image in our game world
  const backgroundImage = this.add.image(0, 0, 'background').setOrigin(0, 0);
  // Scale the image to better match our game's resolution
  backgroundImage.setScale(2, 0.8);

  // Create an idle animation i.e the first frame
  this.anims.create({
    key: 'idle',
    frames: [{ key: 'mustafa', frame: 'robo_player_0' }],
    frameRate: 10,
  });

  // Create an idle animation i.e the first frame
this.anims.create({
  key: 'idle',
  frames: [{ key: 'ihsan', frame: 'robo_player_0' }],
  frameRate: 10,
});

  this.cursors = this.input.keyboard.createCursorKeys();
  this.leftKeyPressed = false;
  this.rightKeyPressed = false;
  this.upKeyPressed = false;
  this.downKeyPressed = false;
  this.spaceKeyPressed = false;
}

function update() {
  const left = this.leftKeyPressed;
  const right = this.rightKeyPressed;
  const up = this.upKeyPressed;
  const down = this.downKeyPressed;
  const space = this.spaceKeyPressed;

  if (this.cursors.left.isDown) {
    this.leftKeyPressed = true;
  } else if (this.cursors.right.isDown) {
    this.rightKeyPressed = true;
  } else {
    this.leftKeyPressed = false;
    this.rightKeyPressed = false;
  }

  if (this.cursors.up.isDown) {
    this.upKeyPressed = true;
  } else if (this.cursors.down.isDown){
    this.downKeyPressed = true;
  } else {
    this.upKeyPressed = false;
    this.downKeyPressed = false;
  }

  if (this.cursors.space.isDown) {
    this.spaceKeyPressed = true;
  } else {
    this.spaceKeyPressed = false;
  }

  if (left !== this.leftKeyPressed
      || right !== this.rightKeyPressed
      || up !== this.upKeyPressed
      || down !== this.downKeyPressed
      || space !== this.spaceKeyPressed) {
    this.socket.emit('playerInput',
      { left: this.leftKeyPressed,
        right: this.rightKeyPressed,
        up: this.upKeyPressed,
        down: this.downKeyPressed,
        space: this.spaceKeyPressed});
  }
}

function addPlayer(game, playerInfo) {
  const player = game.add.sprite(playerInfo.x, playerInfo.y, playerInfo.character);
  player.setOrigin(playerInfo.x, playerInfo.y);
  player.setDisplaySize(53, 40);
  player.playerId = playerInfo.playerId;
  game.players.add(player);
}
