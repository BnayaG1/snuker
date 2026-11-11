"use strict";

var sprites = {};
var sounds = {};

/** Classic pool ball base colors for numbers 1–7 / 9–15. */
var POOL_BALL_COLORS = {
    1: "#F0C400",
    2: "#1E5AA8",
    3: "#C62828",
    4: "#6A1B9A",
    5: "#EF6C00",
    6: "#2E7D32",
    7: "#6D1B2A",
    8: "#111111",
    9: "#F0C400",
    10: "#1E5AA8",
    11: "#C62828",
    12: "#6A1B9A",
    13: "#EF6C00",
    14: "#2E7D32",
    15: "#6D1B2A"
};

/**
 * Build a numbered 8-ball sprite (solid / stripe / 8 / cue).
 * Returns a canvas usable with Canvas2D.drawImage.
 */
function createPoolBallSprite(number, kind) {
    var size = 50;
    var canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext("2d");
    var cx = size / 2;
    var cy = size / 2;
    var r = size / 2 - 1;
    var base = POOL_BALL_COLORS[number] || "#F5F5F5";

    ctx.clearRect(0, 0, size, size);

    // Sphere body
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();

    if (kind === "cue") {
        var cueGrad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
        cueGrad.addColorStop(0, "#FFFFFF");
        cueGrad.addColorStop(0.7, "#F0F0F0");
        cueGrad.addColorStop(1, "#C8C8C8");
        ctx.fillStyle = cueGrad;
        ctx.fill();
    } else if (kind === "stripe") {
        ctx.fillStyle = "#F4F4F4";
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = base;
        ctx.fillRect(0, cy - r * 0.42, size, r * 0.84);
        ctx.restore();
    } else if (kind === "eight") {
        var eightGrad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
        eightGrad.addColorStop(0, "#3A3A3A");
        eightGrad.addColorStop(0.55, "#141414");
        eightGrad.addColorStop(1, "#050505");
        ctx.fillStyle = eightGrad;
        ctx.fill();
    } else {
        var solidGrad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.12, cx, cy, r);
        solidGrad.addColorStop(0, shadeColor(base, 35));
        solidGrad.addColorStop(0.55, base);
        solidGrad.addColorStop(1, shadeColor(base, -40));
        ctx.fillStyle = solidGrad;
        ctx.fill();
    }

    // Number disc (skip cue)
    if (kind !== "cue") {
        var discR = r * 0.38;
        ctx.beginPath();
        ctx.arc(cx, cy - r * 0.02, discR, 0, Math.PI * 2);
        ctx.fillStyle = "#F7F7F7";
        ctx.fill();

        ctx.fillStyle = "#151515";
        ctx.font = "bold " + Math.floor(discR * 1.45) + "px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(number), cx, cy - r * 0.02 + 1);
    }

    // Gloss
    var gloss = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, 0, cx - r * 0.2, cy - r * 0.25, r * 0.55);
    gloss.addColorStop(0, "rgba(255,255,255,0.55)");
    gloss.addColorStop(0.35, "rgba(255,255,255,0.12)");
    gloss.addColorStop(1, "rgba(255,255,255,0)");
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = gloss;
    ctx.fill();

    // Rim
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();

    return canvas;
}

function shadeColor(hex, percent) {
    var h = hex.replace("#", "");
    if (h.length === 3) {
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    var num = parseInt(h, 16);
    var r = (num >> 16) + percent;
    var g = ((num >> 8) & 0xff) + percent;
    var b = (num & 0xff) + percent;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function buildNumberedPoolBallSprites() {
    sprites.poolBall = {};
    sprites.ball = createPoolBallSprite(0, "cue");
    sprites.blackBall = createPoolBallSprite(8, "eight");
    sprites.poolBall[8] = sprites.blackBall;

    for (var n = 1; n <= 7; n++) {
        sprites.poolBall[n] = createPoolBallSprite(n, "solid");
    }
    for (var s = 9; s <= 15; s++) {
        sprites.poolBall[s] = createPoolBallSprite(s, "stripe");
    }

    // Policy still uses yellow=solids / red=stripes as group colors.
    sprites.yellowBall = sprites.poolBall[1];
    sprites.redBall = sprites.poolBall[9];
}

Game.loadAssets = function () {
    var loadSprite = function (sprite) {
        return Game.loadSprite("assets/sprites/" + sprite);
    };

     var loadSound = function (sound) {
        return new Audio("assets/sounds/" + sound);
    };

    buildNumberedPoolBallSprites();

    sprites.mainMenuBackground = loadSprite("main_menu_background.png");
    sprites.background = loadSprite("spr_background4.png");
    sprites.stick = loadSprite("spr_stick.png");
    sprites.twoPlayersButton = loadSprite("2_players_button.png");
    sprites.twoPlayersButtonHover = loadSprite("2_players_button_hover.png");
    sprites.onePlayersButton = loadSprite("1_player_button.png");
    sprites.onePlayersButtonHover = loadSprite("1_player_button_hover.png");
    sprites.muteButton = loadSprite("mute_button.png");
    sprites.muteButtonHover = loadSprite("mute_button_hover.png");
    sprites.muteButtonPressed = loadSprite("mute_button_pressed.png");
    sprites.muteButtonPressedHover = loadSprite("mute_button_pressed_hover.png");
    sprites.easyButton = loadSprite("easy_button.png");
    sprites.easyButtonHover = loadSprite("easy_button_hover.png");
    sprites.mediumButton = loadSprite("medium_button.png");
    sprites.mediumButtonHover = loadSprite("medium_button_hover.png");
    sprites.hardButton = loadSprite("hard_button.png");
    sprites.hardButtonHover = loadSprite("hard_button_hover.png");
    sprites.backButton = loadSprite("back_button.png");
    sprites.backButtonHover = loadSprite("back_button_hover.png");
    sprites.continueButton = loadSprite("continue_button.png");
    sprites.continueButtonHover = loadSprite("continue_button_hover.png");
    sprites.insaneButton = loadSprite("insane_button.png");
    sprites.insaneButtonHover = loadSprite("insane_button_hover.png");
    sprites.aboutButton = loadSprite("about_button.png");
    sprites.aboutButtonHover = loadSprite("about_button_hover.png");
    sprites.controls = loadSprite("controls.png");

    sounds.side = loadSound("Side.wav");
    sounds.ballsCollide = loadSound("BallsCollide.wav");
    sounds.strike = loadSound("Strike.wav");
    sounds.hole = loadSound("Hole.wav");
    
    // Bossa Antigua Kevin MacLeod (incompetech.com)
    // Licensed under Creative Commons: By Attribution 3.0 License
    // http://creativecommons.org/licenses/by/3.0/
    sounds.jazzTune = loadSound("Bossa Antigua.mp3");
}

sounds.fadeOut = function(sound) {

    var fadeAudio = setInterval(function () {

        if(GAME_STOPPED)
            return;

        // Only fade if past the fade out point or not at zero already
        if ((sound.volume >= 0.05)) {
            sound.volume -= 0.05;
        }
        else{
            sound.pause();
            clearInterval(fadeAudio);
        }
    }, 400);
}