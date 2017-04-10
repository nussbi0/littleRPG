var context = document.getElementById('tutorial').getContext('2d');

var map = {
    tsize: 16,
    cols: 0,
    rows: 0,
    tiles: [],
    getTile: function (col, row) {
        return this.tiles[row * map.cols + col];
    },
    isSolidTileAtXY: function (x, y) {
        var col = Math.floor(x / this.tsize);
        var row = Math.floor(y / this.tsize);

        // tiles 3 and 5 are solid -- the rest are walkable
        // loop through all layers and return TRUE if any tile is solid
        return this.layers.reduce(function (res, layer, index) {
            var tile = this.getTile(index, col, row);
            var isSolid = tile === 3 || tile === 5;
            return res || isSolid;
        }.bind(this), false);
    },
    getCol: function (x) {
        return Math.floor(x / this.tsize);
    },
    getRow: function (y) {
        return Math.floor(y / this.tsize);
    },
    getX: function (col) {
        return col * this.tsize;
    },
    getY: function (row) {
        return row * this.tsize;
    }
};

//set row and cols based on canvas size
map.cols = context.canvas.width / map.tsize;
map.rows = context.canvas.width / map.tsize;

for (var c = 0; c < map.cols; c++) {
    for (var r = 0; r < map.rows; r++) {
        map.tiles.push(1);
    }
};

var Loader = {
    images: {}
};

Loader.loadImage = function (key, src) {
    var img = new Image();

    var d = new Promise(function (resolve, reject) {
        img.onload = function () {
            this.images[key] = img;
            resolve(img);
        }.bind(this);

        img.onerror = function () {
            reject('Could not load image: ' + src);
        };
    }.bind(this));

    img.src = src;
    return d;
};

Loader.getImage = function (key) {
    return (key in this.images) ? this.images[key] : null;
};

//
// Keyboard handler
//

var Keyboard = {};

//wasd
Keyboard.LEFT = 65;
Keyboard.RIGHT = 68;
Keyboard.UP = 87;
Keyboard.DOWN = 83;

Keyboard._keys = {};

Keyboard.listenForEvents = function (keys) {
    window.addEventListener('keydown', this._onKeyDown.bind(this));
    window.addEventListener('keyup', this._onKeyUp.bind(this));

    keys.forEach(function (key) {
        this._keys[key] = false;
    }.bind(this));
}

Keyboard._onKeyDown = function (event) {
    var keyCode = event.keyCode;
    if (keyCode in this._keys) {
        event.preventDefault();
        this._keys[keyCode] = true;
    }
};

Keyboard._onKeyUp = function (event) {
    var keyCode = event.keyCode;
    if (keyCode in this._keys) {
        event.preventDefault();
        this._keys[keyCode] = false;
    }
};

Keyboard.isDown = function (keyCode) {
    if (!keyCode in this._keys) {
        throw new Error('Keycode ' + keyCode + ' is not being listened to');
    }
    return this._keys[keyCode];
};


class Hero {
    constructor(map, x, y) {
        this.map = map;
        this.x = x;
        this.y = y;
        this.width = 16;
        this.height = 32;

        this.speed = 16;

        this.spriteX = 0;
        this.spriteY = 0;

        this.xTile = this.x;
        this.yTile = this.y;

        this.image = Loader.getImage('character');
    }
};

class Enemy extends Hero {
    constructor(map, x, y) {
        super(map, x, y);

        this.height = 16;
        this.image = Loader.getImage('monster');
        this.isMoving = false;
        this.speed = 8;

        this.startX = x;
        this.startY = y;

        this.targetX = Math.floor(Math.random() * (Game.ctx.canvas.width / map.tsize - 1)) + 0;
        this.targetY = Math.floor(Math.random() * (Game.ctx.canvas.height / map.tsize - 1)) + 0;
    }
}

Hero.prototype.move = function (delta, dirx, diry) {
    // if diagonal movement, slow speed down a bit
    if (dirx != 0 && diry != 0) {
        dirx *= 0.707;
        diry *= 0.707;
    }

    // change sprite
    if (dirx > 0) {
        this.spriteX = 0;
        this.spriteY = 32;
    }
    if (dirx < 0) {
        this.spriteX = 0;
        this.spriteY = 96;
    }
    if (diry > 0) {
        this.spriteX = 0;
        this.spriteY = 0;
    }
    if (diry < 0) {
        this.spriteX = 0;
        this.spriteY = 64;
    }

    // move hero
    this.x += dirx * this.speed * delta;
    this.y += diry * this.speed * delta;

    // check if we walked into a non-walkable tile
    // this._collide(dirx, diry);

    // clamp values
    // var maxX = this.map.cols * this.map.tsize;
    // var maxY = this.map.rows * this.map.tsize;
    var maxX = this.map.cols;
    var maxY = this.map.rows;
    // this.x = Math.max(0, Math.min(this.x, maxX));
    // this.y = Math.max(0, Math.min(this.y, maxY));

    this.xTile = Math.floor(this.x);
    this.yTile = Math.floor(this.y);

    if (this.x >= maxX - 1) {
        // console.log('left to the right');
        this.x = maxX - 1;
    }
    if (this.y >= maxY - 2) {
        // console.log('left to the bottom');
        this.y = maxY - 2;
    }
    if (this.x <= 0) {
        // console.log('left to the left');
        this.x = 0;
    }
    if (this.y <= 0) {
        // console.log('left to the top');
        this.y = 0;
    }
};

var Game = {};

Game.run = function (context) {
    this.ctx = context;
    this._previousElapsed = 0;

    var p = this.load();
    Promise.all(p).then(function (loaded) {
        this.init();
        window.requestAnimationFrame(this.tick);
    }.bind(this));
};

Game.tick = function (elapsed) {
    window.requestAnimationFrame(this.tick);

    // clear previous frame
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    // compute delta time in seconds -- also cap it
    var delta = (elapsed - this._previousElapsed) / 1000.0;
    delta = Math.min(delta, 0.25); // maximum delta of 250 ms
    this._previousElapsed = elapsed;

    this.update(delta);
    this.render();
}.bind(Game);


Game.load = function () {
    return [
        Loader.loadImage('tiles', 'assets/overworld.png'),
        Loader.loadImage('character', 'assets/character.png'),
        Loader.loadImage('monster', 'assets/monsters.png')
    ];
};

Game.init = function () {
    Keyboard.listenForEvents(
        [Keyboard.LEFT, Keyboard.RIGHT, Keyboard.UP, Keyboard.DOWN]);
    this.tileAtlas = Loader.getImage('tiles');

    this.hero = new Hero(map, (this.ctx.canvas.width / map.tsize - 1) / 2, (this.ctx.canvas.height / map.tsize) / 2);
    
    this.enemies = [];
    this.enemies.push(new Enemy(map, Math.floor(Math.random() * (this.ctx.canvas.width / map.tsize - 1)) + 0, Math.floor(Math.random() * (this.ctx.canvas.height / map.tsize)) + 0));
};

Game.update = function (delta) {
    // handle hero movement with wasd keys
    var dirx = 0;
    var diry = 0;

    if (Keyboard.isDown(Keyboard.LEFT)) {
        dirx = -1;
    } else if (Keyboard.isDown(Keyboard.RIGHT)) {
        dirx = 1;
    }
    if (Keyboard.isDown(Keyboard.UP)) {
        diry = -1;
    } else if (Keyboard.isDown(Keyboard.DOWN)) {
        diry = 1;
    }

    this.hero.move(delta, dirx, diry);
    // console.log(this.hero.x, this.hero.y);

    for (var e in this.enemies) {
        if (this.enemies[e].isMoving) {
            // var e_distX = this.enemies[e].targetX - this.enemies[e].startX;
            // var e_distY = this.enemies[e].targetY - this.enemies[e].startY;

            // var angle = Math.atan2(e_distY, e_distX);

            // e_distX = Math.cos(angle) * 1;
            // e_distY = Math.sin(angle) * 1;
            // // var dist = Math.sqrt(e_distX * e_distX + e_distY * e_distY);

            // this.enemies[e].isMoving = true;
            //if(this.enemies[e].targetX > this.enemies[e].x) {dirx=1};
            this.enemies[e].move(delta, dirx, diry);
            // console.log(this.enemies[e].x, this.enemies[e].y);

            if (this.enemies[e].x = this.enemies[e].targetX && this.enemies[e].y == this.enemies[e].targetY) {
                this.enemies[e].isMoving = false;
                this.enemies[e].targetX = Math.floor(Math.random() * (Game.ctx.canvas.width / map.tsize - 1)) + 0;
                this.enemies[e].targetY = Math.floor(Math.random() * (Game.ctx.canvas.height / map.tsize - 1)) + 0;
            }
        } else {
            this.enemies[e].targetX = Math.floor(Math.random() * (Game.ctx.canvas.width / map.tsize - 1)) + 0;
            this.enemies[e].targetY = Math.floor(Math.random() * (Game.ctx.canvas.height / map.tsize - 1)) + 0;
            this.enemies[e].isMoving = true;
        }


    }
    // this.camera.update();
};

Game.render = function () {
    for (var c = 0; c < map.cols; c++) {
        for (var r = 0; r < map.rows; r++) {
            var tile = map.getTile(c, r);
            if (tile !== 0) { // 0 => empty tile
                context.drawImage(
                    this.tileAtlas, // image
                    (tile - 1) * map.tsize, // source x
                    0, // source y
                    map.tsize, // source width
                    map.tsize, // source height
                    c * map.tsize, // target x
                    r * map.tsize, // target y
                    map.tsize, // target width
                    map.tsize // target height
                );
            }
        }
    }

    this.ctx.drawImage(this.hero.image, this.hero.spriteX, this.hero.spriteY, this.hero.width, this.hero.height, this.hero.x * this.hero.width, this.hero.y * this.hero.width, this.hero.width, this.hero.height)

    for (var e in this.enemies) {
        this.ctx.drawImage(this.enemies[e].image, 0, 0, this.enemies[e].width, this.enemies[e].height, this.enemies[e].x * this.enemies[e].width, this.enemies[e].y * this.enemies[e].height, this.enemies[e].width, this.enemies[e].height);
    }
}

//
// start up function
//

window.onload = function () {
    var canvas = document.getElementById('tutorial')
    var context = canvas.getContext('2d');

    // no blurrs :)
    context.webkitImageSmoothingEnabled = false;
    context.imageSmoothingEnabled = false;

    Game.run(context);

    canvas.addEventListener('mousedown', function (event) {
        // moveHero(canvas, event);
        var mousePos = getMousePos(canvas, event);
        console.log('Mouse position: ' + Math.floor(mousePos.x / 16) + ',' + Math.floor(mousePos.y / 16));
        console.log(Game.hero);
    }, false);
};

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}