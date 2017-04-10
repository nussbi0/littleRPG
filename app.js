var context = document.getElementById('tutorial').getContext('2d');

var map = {
    cols: 64,
    rows: 64,
    tsize: 16,
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


function Hero(map, x, y) {
    this.map = map;
    this.x = x;
    this.y = y;
    this.width = 16;
    this.height = 32;

    this.xTile = this.x;
    this.yTile = this.y;

    this.image = Loader.getImage('character');
};

Hero.SPEED = 16; // pixels per second

Hero.prototype.move = function (delta, dirx, diry) {
    // if diagonal movement
    if (dirx != 0 && diry != 0) {
        dirx *= 0.707;
        diry *= 0.707;
    }

    //TODO: change sprite
    

    // move hero
    this.x += dirx * Hero.SPEED * delta;
    this.y += diry * Hero.SPEED * delta;

    // check if we walked into a non-walkable tile
    // this._collide(dirx, diry);

    // clamp values
    var maxX = this.map.cols * this.map.tsize;
    var maxY = this.map.rows * this.map.tsize;
    this.x = Math.max(0, Math.min(this.x, maxX));
    this.y = Math.max(0, Math.min(this.y, maxY));

    this.xTile = Math.floor(this.x);
    this.yTile = Math.floor(this.y);
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
    this.ctx.canvas.width = window.innerWidth;
    this.ctx.canvas.height = window.innerHeight;
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
        Loader.loadImage('character', 'assets/character.png')
    ];
};

Game.init = function () {
    Keyboard.listenForEvents(
        [Keyboard.LEFT, Keyboard.RIGHT, Keyboard.UP, Keyboard.DOWN]);
    this.tileAtlas = Loader.getImage('tiles');

    this.hero = new Hero(map, 31, 32);

    // this.tileAtlas = Loader.getImage('tiles');
    // this.hero.image = Loader.getImage('character');
    // this.hero = {x: 256, y: 256, image: Loader.getImage('character'), moveTo: function(x,y){this.x = 16*x;this.y = 16*y}};
};

Game.update = function (delta) {
    // handle hero movement with wasd keys
    var dirx = 0;
    var diry = 0;

    if (Keyboard.isDown(Keyboard.LEFT)) {
        dirx = -1;
    }
    else if (Keyboard.isDown(Keyboard.RIGHT)) {
        dirx = 1;
    }
    if (Keyboard.isDown(Keyboard.UP)) {
        diry = -1;
    }
    else if (Keyboard.isDown(Keyboard.DOWN)) {
        diry = 1;
    }

    this.hero.move(delta, dirx, diry);
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

    // this.ctx.drawImage(this.hero.image, this.hero.screenX - this.hero.width / 2, this.hero.screenY - this.hero.height / 2);
    // console.log(this.hero)
    this.ctx.drawImage(this.hero.image, 0, 0, 16, 32, this.hero.x * 16, this.hero.y * 16, 16, 32)
}

//
// start up function
//

window.onload = function () {
    var canvas = document.getElementById('tutorial')
    var context = canvas.getContext('2d');

    Game.run(context);

    canvas.addEventListener('mouseup', function (event) {
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
