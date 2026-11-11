"use strict";

function Stick(position){
    this.position = position;
    this.origin = new Vector2(970,11);
    this.shotOrigin = new Vector2(950,11);
    this.shooting = false;
    this.visible = true;
    this.rotation = 0;
    this.power = 0;
    this.trackMouse = true;
    this._touchDown = false;
    this._charging = false;
}

Stick.prototype.handleInput = function (delta) {

    if(AI_ON && Game.policy.turn === AI_PLAYER_NUM)
      return;

    if(Game.policy.turnPlayed)
      return;

    if(!this.visible)
      return;

    // Mobile / overlay: pull stick back, release to strike.
    if (window.SNUKER_EMBED) {
      this.handleTouchStrike();
      return;
    }

    if(Keyboard.down(Keys.W) && KEYBOARD_INPUT_ON){
      if(this.power < 75){
        this.origin.x+=2;
        this.power+=1.2;
      }
    }

    if(Keyboard.down(Keys.S) && KEYBOARD_INPUT_ON){
      if(this.power>0){
        this.origin.x-=2;
        this.power-=1.2;
      }
    }

    else if (this.power>0 && Mouse.left.down){
      var strike = sounds.strike.cloneNode(true);
      strike.volume = (this.power/(10))<1?(this.power/(10)):1;
      strike.play();
      Game.policy.turnPlayed = true;
      this.shooting = true;
      this.origin = this.shotOrigin.copy();

      Game.gameWorld.whiteBall.shoot(this.power, this.rotation);
      var stick = this;
      setTimeout(function(){stick.visible = false;}, 500);
    }
    else if(this.trackMouse){
      var opposite = Mouse.position.y - this.position.y;
      var adjacent = Mouse.position.x - this.position.x;
      this.rotation = Math.atan2(opposite, adjacent);
    }
};

/** Aim with finger; drag away from cue ball to charge; release to shoot. */
Stick.prototype.handleTouchStrike = function () {
  var down = Mouse.left.down;
  var justReleased = this._touchDown && !down;
  this._touchDown = down;

  if (this.shooting)
    return;

  if (down) {
    var dx = Mouse.position.x - this.position.x;
    var dy = Mouse.position.y - this.position.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (this.trackMouse) {
      this.rotation = Math.atan2(dy, dx);
    }

    // Start charging once the finger is pulled far enough behind the cue.
    if (!this._charging && dist > 36) {
      this._charging = true;
    }

    if (this._charging) {
      var power = Math.min(75, Math.max(0, (dist - 36) * 0.38));
      this.power = power;
      // Match W-key pull: +2 origin per +1.2 power.
      this.origin = new Vector2(970 + power * (2 / 1.2), 11);
    }
  } else if (justReleased) {
    if (this.power > 1.5) {
      this.shoot(this.power, this.rotation);
    } else {
      this.power = 0;
      this.origin = new Vector2(970, 11);
    }
    this._charging = false;
  }
};

Stick.prototype.shoot = function(power, rotation){
  this.power = power;
  this.rotation = rotation;

  if(Game.sound && SOUND_ON){
    var strike = sounds.strike.cloneNode(true);
    strike.volume = (this.power/(10))<1?(this.power/(10)):1;
    strike.play();
  }
  Game.policy.turnPlayed = true;
  this.shooting = true;
  this.origin = this.shotOrigin.copy();

  Game.gameWorld.whiteBall.shoot(this.power, this.rotation);
  var stick = this;
  setTimeout(function(){stick.visible = false;}, 500);
}

Stick.prototype.update = function(){
  if(this.shooting && !Game.gameWorld.whiteBall.moving)
    this.reset();
};

Stick.prototype.reset = function(){
  this.position.x = Game.gameWorld.whiteBall.position.x;
  this.position.y = Game.gameWorld.whiteBall.position.y;
	this.origin = new Vector2(970,11);
  this.shooting = false;
  this.visible = true;
	this.power = 0;
  this._charging = false;
  this._touchDown = false;
};

Stick.prototype.draw = function () {
  if(!this.visible)
    return;
  Canvas2D.drawImage(sprites.stick, this.position,this.rotation,1, this.origin);
};
