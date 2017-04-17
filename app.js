var context = document.getElementById('tutorial').getContext('2d');
var inventoryDiv = document.getElementById('inventory');
var topLayer = document.getElementById('topLayer');

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
Keyboard.E = 69;

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

class Item {
    constructor(id, name, name_pl, x, y) {
        this.x = x
        this.y = y
        this.id = id
        this.Name = name
        this.NamePlural = name_pl
        this.width = 16
        this.height = 16
        this.image = Loader.getImage('item');
    }
}

class Hero {
    constructor(map, x, y) {
        this.map = map;
        this.x = x;
        this.y = y;
        this.width = 16;
        this.height = 32;

        this.health = 50;
        this.maxHealth = 50;
        this.attackDamage = 5;

        this.isIdle = true;
        this.isAttacking = false;

        this.speed = 16;

        this.spriteX = 0;
        this.spriteY = 0;
        this.spriteRow = 0;

        this.shift = 0;
        this.totalFrames = 4;
        this.currentFrame = 0;

        this.xTile = this.x;
        this.yTile = this.y;

        this.image = Loader.getImage('character');

        this.sectors = {
            right: {},
            bottom: {},
            left: {},
            top: {}
        };

        this.inventory = []
    }
};

class Enemy extends Hero {
    constructor(map, x, y, id) {
        super(map, x, y);

        this.id = id;
        this.height = 16;
        this.image = Loader.getImage('monster');
        this.isMoving = false;
        this.speed = 4;

        this.health = 10;
        this.maxHealth = 10;

        this.startX = x;
        this.startY = y;

        var healthbar = document.createElement('progress');
        healthbar.className = 'healthbar';
        healthbar.id = 'health' + this.id;
        topLayer.appendChild(healthbar);
        this.healthbar = healthbar;
        this.healthbar.max = this.maxHealth;

        this.targetX = Math.floor(Math.random() * (Game.ctx.canvas.width / map.tsize - 1)) + 0;
        this.targetY = Math.floor(Math.random() * (Game.ctx.canvas.height / map.tsize - 1)) + 0;
    }
}

Enemy.prototype.move = function (delta, target_x, target_y) {
    var dirx = target_x - this.x;
    var diry = target_y - this.y;

    // Normalize
    var dirLength = Math.sqrt((dirx * dirx) + (diry * diry));
    dirx = dirx / dirLength;
    diry = diry / dirLength;

    // Move towards the player
    this.x += dirx * this.speed * delta;
    this.y += diry * this.speed * delta;

    if (this.x >= this.map.cols - 1) {
        // console.log('left to the right');
        this.x = this.map.cols - 1;
    }
    if (this.y >= this.map.rows - 1) {
        // console.log('left to the bottom');
        this.y = this.map.rows - 1;
    }
    if (this.x <= 0) {
        // console.log('left to the left');
        this.x = 0;
    }
    if (this.y <= 0) {
        // console.log('left to the top');
        this.y = 0;
    }
}

function distance(entity) {
    var x = entity.targetX - entity.x,
        y = entity.targetY - entity.y,
        dist = Math.sqrt(x * x + y * y),
        collision = false;

    // check the distance against the sum of both objects radius. If its less its a hit
    if (dist < 2 + 2) {
        collision = true;
    }

    return collision;
}

Hero.prototype.move = function (delta, dirx, diry) {
    // check if idle
    if (dirx == 0 && diry == 0) {
        this.isIdle = true;
    } else {
        this.isIdle = false;
    }

    // if diagonal movement, slow speed down a bit
    if (dirx != 0 && diry != 0) {
        dirx *= 0.707;
        diry *= 0.707;
    }

    // change sprite if not attacking simultanoulsy
    if (this.isAttacking != true) {
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

    this.radius.x = this.x;
    this.radius.y = this.y;
};

Hero.prototype.render = function () {
    // draw sprite to canvas
    Game.ctx.drawImage(this.image, this.shift, this.spriteY, this.width, this.height, this.x * this.width, this.y * this.width, this.width, this.height)
};

Enemy.prototype.render = function () {
    // draw sprite to canvas
    Game.ctx.drawImage(this.image, 146, 0, this.width, this.height, this.x * this.width, this.y * this.height, this.width, this.height);

    // update healthbar
    this.healthbar.value = this.health;
    this.healthbar.style.left = this.x * 16 + 8 + "px";
    this.healthbar.style.top = this.y * 16 + 15 + "px";
};

Hero.prototype.attack = function (direction) {
    switch (direction) {
        case "left":
            this.spriteY = 224;
            break;
        case "right":
            this.spriteY = 192;
            break;
        case "bottom":
            this.spriteY = 128;
            break;
        case "top":
            this.spriteY = 160;
            break;
    };

    this.isAttacking = true;
    this.shift = 8;

    Game.enemies.forEach(function (enemy) {
        if (isInsideSector({
                x: enemy.x + enemy.width / 16 / 2,
                y: enemy.y + enemy.height / 16 / 2
            }, {
                x: Game.hero.x + Game.hero.width / 16 / 2,
                y: Game.hero.y + Game.hero.height / 16 / 2
            }, Game.hero.radius.radius / 16, Game.hero.sectors[direction].start, Game.hero.sectors[direction].end)) {

            // perform Attack
            dealDamage(Game.hero, enemy);
        }

    });

    // console.log('attack ' + direction);
};

Hero.prototype.pickUp = function () {
    Game.lootItems.forEach(function (item, index, object) {
        if (isInsideRadius({
                x: item.x + item.width / 16 / 2,
                y: item.y + item.height / 16 / 2
            }, {
                x: Game.hero.x + Game.hero.width / 16 / 2,
                y: Game.hero.y + Game.hero.height / 16 / 2
            }, Game.hero.radius.radius / 16)) {

            // put item in inventory and remove from Game.lootItems
            Game.hero.inventory.push(item);
            object.splice(index, 1);
            // console.log(Game.hero.inventory, Game.lootItems);
        }
    });

    // update inventory
    if (this.inventory.length > 0) {
        inventoryDiv.innerHTML = "Inventory:";
        inventoryDiv.innerHTML += "<ul>";
        Game.hero.inventory.forEach(function (item) {
            inventoryDiv.innerHTML += "<li>" + item.Name + "</li>";
        });
        inventoryDiv.innerHTML += "</ul>";
    }
}

Hero.prototype.update = function () {
    if (this.isIdle != true && this.isAttacking != true) {
        this.currentFrame += 1;
        if (this.currentFrame > this.totalFrames) {
            this.shift += this.width;
            this.currentFrame = 0;
        }
        if (this.shift >= this.width * this.totalFrames) {
            this.shift = 0;
        }
    } else if (this.isAttacking) {
        this.currentFrame += 1;
        if (this.currentFrame > this.totalFrames) {
            this.shift += this.width * 2;
            this.currentFrame = 0;
        }
        if (this.shift >= (this.width * 2) * this.totalFrames) {
            this.shift = 0;
            this.spriteY = 0;
            this.isIdle = true;
            this.isAttacking = false;
        }
    }
};

var Game = {
    mX: 0,
    mY: 0,
};

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
        Loader.loadImage('monster', 'assets/monsters.png'),
        Loader.loadImage('item', 'assets/objects.png'),
    ];
};

Game.init = function () {
    Keyboard.listenForEvents(
        [Keyboard.LEFT, Keyboard.RIGHT, Keyboard.UP, Keyboard.DOWN, Keyboard.E]);
    this.tileAtlas = Loader.getImage('tiles');

    this.hero = new Hero(map, (this.ctx.canvas.width / map.tsize - 1) / 2, (this.ctx.canvas.height / map.tsize) / 2);
    this.hero.radius = new Radius(this.hero.x, this.hero.y, 30);

    this.lootItems = [];
    for (var i = 0; i < 4; i++) {
        this.lootItems.push(new Item(i, "item " + i, "items " + i, Math.floor(Math.random() * (this.ctx.canvas.width / map.tsize - 1)) + 0, Math.floor(Math.random() * (this.ctx.canvas.height / map.tsize)) + 0))
    }

    this.enemies = [];
    this.enemies.push(new Enemy(map, Math.floor(Math.random() * (this.ctx.canvas.width / map.tsize - 1)) + 0, Math.floor(Math.random() * (this.ctx.canvas.height / map.tsize)) + 0, 1));
    this.enemies.push(new Enemy(map, Math.floor(Math.random() * (this.ctx.canvas.width / map.tsize - 1)) + 0, Math.floor(Math.random() * (this.ctx.canvas.height / map.tsize)) + 0, 2));
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

    if (Keyboard.isDown(Keyboard.E)) {
        this.hero.pickUp();
    }

    this.hero.move(delta, dirx, diry);

    this.enemies.forEach(function (enemy) {
        enemy.move(delta, enemy.targetX, enemy.targetY);
        if (distance(enemy)) {
            enemy.targetX = Math.floor(Math.random() * (Game.ctx.canvas.width / map.tsize - 1)) + 0;
            enemy.targetY = Math.floor(Math.random() * (Game.ctx.canvas.height / map.tsize - 1)) + 0;

        } else {

        }
    });
};

var Radius = function (x, y, radius) {
    this.x = x || 0;
    this.y = y || 0;
    this.radius = radius || 10;
}

function toRadians(deg) {
    return deg * Math.PI / 180
}

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

    // draw radius
    this.ctx.fillStyle = "rgba(0,0,255,0.3)";
    this.ctx.beginPath();
    this.ctx.moveTo(this.hero.radius.x * this.hero.width + this.hero.width / 2, this.hero.radius.y * this.hero.width + this.hero.height / 2);
    this.ctx.arc(this.hero.radius.x * this.hero.width + this.hero.width / 2, this.hero.radius.y * this.hero.width + this.hero.height / 2, this.hero.radius.radius, toRadians(-45), toRadians(55));
    this.ctx.lineTo(this.hero.radius.x * this.hero.width + this.hero.width / 2, this.hero.radius.y * this.hero.width + this.hero.height / 2);
    this.ctx.closePath();
    this.ctx.fill();
    var right = {
        start: toRadians(-45),
        end: toRadians(55),
        name: "right"
    };
    this.hero.sectors.right = right;

    this.ctx.fillStyle = "rgba(244,113,65,0.3)";
    this.ctx.beginPath();
    this.ctx.moveTo(this.hero.radius.x * this.hero.width + this.hero.width / 2, this.hero.radius.y * this.hero.width + this.hero.height / 2);
    this.ctx.arc(this.hero.radius.x * this.hero.width + this.hero.width / 2, this.hero.radius.y * this.hero.width + this.hero.height / 2, this.hero.radius.radius, toRadians(55), toRadians(145));
    this.ctx.lineTo(this.hero.radius.x * this.hero.width + this.hero.width / 2, this.hero.radius.y * this.hero.width + this.hero.height / 2);
    this.ctx.closePath();
    this.ctx.fill();
    var bottom = {
        start: toRadians(55),
        end: toRadians(145),
        name: "bottom"
    };
    this.hero.sectors.bottom = bottom;

    this.ctx.fillStyle = "rgba(244,217,65,0.3)";
    this.ctx.beginPath();
    this.ctx.moveTo(this.hero.radius.x * this.hero.width + this.hero.width / 2, this.hero.radius.y * this.hero.width + this.hero.height / 2);
    this.ctx.arc(this.hero.radius.x * this.hero.width + this.hero.width / 2, this.hero.radius.y * this.hero.width + this.hero.height / 2, this.hero.radius.radius, toRadians(145), toRadians(235));
    this.ctx.lineTo(this.hero.radius.x * this.hero.width + this.hero.width / 2, this.hero.radius.y * this.hero.width + this.hero.height / 2);
    this.ctx.closePath();
    this.ctx.fill();
    var left = {
        start: toRadians(145),
        end: toRadians(235),
        name: "left"
    };
    this.hero.sectors.left = left;

    this.ctx.fillStyle = "rgba(238,65,244,0.3)";
    this.ctx.beginPath();
    this.ctx.moveTo(this.hero.radius.x * this.hero.width + this.hero.width / 2, this.hero.radius.y * this.hero.width + this.hero.height / 2);
    this.ctx.arc(this.hero.radius.x * this.hero.width + this.hero.width / 2, this.hero.radius.y * this.hero.width + this.hero.height / 2, this.hero.radius.radius, toRadians(235), toRadians(-45));
    this.ctx.lineTo(this.hero.radius.x * this.hero.width + this.hero.width / 2, this.hero.radius.y * this.hero.width + this.hero.height / 2);
    this.ctx.closePath();
    this.ctx.fill();
    var top = {
        start: toRadians(235),
        end: toRadians(-45),
        name: "top"
    };
    this.hero.sectors.top = top;

    //draw items
    this.lootItems.forEach(function (item) {
        Game.ctx.drawImage(item.image, 0, 0, item.width, item.height, item.x * item.width, item.y * item.height, item.width, item.height);
    });

    // draw enemies
    this.enemies.forEach(function (enemy) {
        enemy.render();
    });

    // draw hero
    this.hero.update();
    this.hero.render();
}

//
// start up function
// 

function dealDamage(dealer, victim) {
    victim.health -= dealer.attackDamage;
    if (victim.health <= 0) {
        for (i = Game.enemies.length - 1; i >= 0; i--) {
            if (Game.enemies[i].id == victim.id) {
                Game.enemies[i].healthbar.parentElement.removeChild(Game.enemies[i].healthbar);
                Game.enemies.splice(i, 1);
            }
        }
    }
}

function isInsideRadius(point, center, radius) {
    function areClockwise(center, radius, point2) {
        var point1 = {
            x: (center.x + radius),
            y: (center.y + radius)
        };
        return -point1.x * point2.y + point1.y * point2.x > 0;
    }

    var relPoint = {
        x: point.x - center.x,
        y: point.y - center.y
    };

    return (relPoint.x * relPoint.x + relPoint.y * relPoint.y <= radius * radius);
}

function isInsideSector(point, center, radius, angle1, angle2) {
    function areClockwise(center, radius, angle, point2) {
        var point1 = {
            x: (center.x + radius) * Math.cos(angle),
            y: (center.y + radius) * Math.sin(angle)
        };
        return -point1.x * point2.y + point1.y * point2.x > 0;
    }

    var relPoint = {
        x: point.x - center.x,
        y: point.y - center.y
    };

    return !areClockwise(center, radius, angle1, relPoint) &&
        areClockwise(center, radius, angle2, relPoint) &&
        (relPoint.x * relPoint.x + relPoint.y * relPoint.y <= radius * radius);
}

window.onload = function () {
    var canvas = document.getElementById('tutorial')
    var context = canvas.getContext('2d');

    // no blurrs :)
    context.webkitImageSmoothingEnabled = false;
    context.imageSmoothingEnabled = false;

    Game.run(context);

    canvas.addEventListener('mousedown', function (event) {
        var mousePos = getMousePos(canvas, event);
        // console.log('Mouse position: ' + Math.floor(mousePos.x / 16) + ',' + Math.floor(mousePos.y / 16));
        // console.log(Game.hero);

        for (var i in Game.hero.sectors) {
            if (isInsideSector({
                    x: mousePos.x / 16,
                    y: mousePos.y / 16
                }, {
                    x: Game.hero.x + Game.hero.width / 16 / 2,
                    y: Game.hero.y + Game.hero.height / 16 / 2
                }, 50, Game.hero.sectors[i].start, Game.hero.sectors[i].end)) {
                // console.log(Game.hero.sectors[i].name + ", mouse x:" + mousePos.x / 16 + ", mouse Y:" + mousePos.y / 16);
                Game.hero.attack(Game.hero.sectors[i].name);
            }
        }

    }, false);

    canvas.addEventListener("mousemove", function (e) {
        Game.mX = e.pageX;
        Game.mY = e.pageY;
    });
};

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}