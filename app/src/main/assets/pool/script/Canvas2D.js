"use strict";

function Canvas2D_Singleton() {
    this._canvas = null;
    this._canvasContext = null;
    this._canvasOffset = Vector2.zero;
    this._snukerRotated = false;
}

Object.defineProperty(Canvas2D_Singleton.prototype, "offset",
    {
        get: function () {
            return this._canvasOffset;
        }
    });

Object.defineProperty(Canvas2D_Singleton.prototype, "scale",
    {
        get: function () {
            return new Vector2(this._canvas.width / Game.size.x,
                this._canvas.height / Game.size.y);
        }
    });

Canvas2D_Singleton.prototype.initialize = function (divName, canvasName) {
    this._canvas = document.getElementById(canvasName);
    this._div = document.getElementById(divName);

    if (this._canvas.getContext)
        this._canvasContext = this._canvas.getContext('2d');
    else {
        alert('Your browser is not HTML5 compatible.!');
        return;
    }
    window.onresize = Canvas2D_Singleton.prototype.resize;
    this.resize();
};

Canvas2D_Singleton.prototype.clear = function () {
    this._canvasContext.clearRect(0, 0, this._canvas.width, this._canvas.height);
};

Canvas2D_Singleton.prototype.resize = function () {
    var gameCanvas = Canvas2D._canvas;
    var gameArea = Canvas2D._div;
    if (!gameCanvas || !gameArea || !Game.size) return;

    var widthToHeight = Game.size.x / Game.size.y;

    // Snuker overlay: phone stays portrait, rotate the landscape table 90° and fill the screen.
    if (window.SNUKER_EMBED) {
        var screenW = window.innerWidth || 1;
        var screenH = window.innerHeight || 1;
        // After 90° rotation, the usable landscape box is (screenH x screenW).
        var availW = screenH;
        var availH = screenW;
        var boxW = availW;
        var boxH = availH;
        var availRatio = availW / availH;

        if (availRatio > widthToHeight) {
            boxW = availH * widthToHeight;
            boxH = availH;
        } else {
            boxW = availW;
            boxH = availW / widthToHeight;
        }

        gameArea.style.position = "fixed";
        gameArea.style.left = "50%";
        gameArea.style.top = "50%";
        gameArea.style.right = "auto";
        gameArea.style.bottom = "auto";
        gameArea.style.width = boxW + "px";
        gameArea.style.height = boxH + "px";
        gameArea.style.margin = "0";
        gameArea.style.transformOrigin = "center center";
        gameArea.style.transform = "translate(-50%, -50%) rotate(90deg)";

        gameCanvas.style.width = "100%";
        gameCanvas.style.height = "100%";
        gameCanvas.width = Math.max(1, Math.floor(boxW));
        gameCanvas.height = Math.max(1, Math.floor(boxH));

        Canvas2D._snukerRotated = true;
        Canvas2D._snukerBoxW = boxW;
        Canvas2D._snukerBoxH = boxH;
        Canvas2D._canvasOffset = new Vector2(0, 0);
        return;
    }

    Canvas2D._snukerRotated = false;

    var newWidth = window.innerWidth;
    var newHeight = window.innerHeight;
    var newWidthToHeight = newWidth / newHeight;

    if (newWidthToHeight > widthToHeight) {
        newWidth = newHeight * widthToHeight;
    } else {
        newHeight = newWidth / widthToHeight;
    }
    gameArea.style.position = "";
    gameArea.style.left = "";
    gameArea.style.top = "";
    gameArea.style.transform = "";
    gameArea.style.width = newWidth + 'px';
    gameArea.style.height = newHeight + 'px';

    gameArea.style.marginTop = (window.innerHeight - newHeight) / 2 + 'px';
    gameArea.style.marginLeft = (window.innerWidth - newWidth) / 2 + 'px';
    gameArea.style.marginBottom = (window.innerHeight - newHeight) / 2 + 'px';
    gameArea.style.marginRight = (window.innerWidth - newWidth) / 2 + 'px';

    gameCanvas.width = newWidth;
    gameCanvas.height = newHeight;

    var offset = Vector2.zero;
    var node = gameCanvas;
    if (node.offsetParent) {
        do {
            offset.x += node.offsetLeft;
            offset.y += node.offsetTop;
        } while ((node = node.offsetParent));
    }
    Canvas2D._canvasOffset = offset;
};

Canvas2D_Singleton.prototype.drawImage = function (sprite, position, rotation, scale, origin) {
    var canvasScale = this.scale;

    position = typeof position !== 'undefined' ? position : Vector2.zero;
    rotation = typeof rotation !== 'undefined' ? rotation : 0;
    scale = typeof scale !== 'undefined' ? scale : 1;
    origin = typeof origin !== 'undefined' ? origin : Vector2.zero;

    this._canvasContext.save();
    this._canvasContext.scale(canvasScale.x, canvasScale.y);
    this._canvasContext.translate(position.x, position.y);
    this._canvasContext.rotate(rotation);
    this._canvasContext.drawImage(sprite, 0, 0,
        sprite.width, sprite.height,
        -origin.x * scale, -origin.y * scale,
        sprite.width * scale, sprite.height * scale);
    this._canvasContext.restore();
};

Canvas2D_Singleton.prototype.drawText = function (text, position, origin, color, textAlign, fontname, fontsize) {
    var canvasScale = this.scale;

    position = typeof position !== 'undefined' ? position : Vector2.zero;
    origin = typeof origin !== 'undefined' ? origin : Vector2.zero;
    color = typeof color !== 'undefined' ? color : Color.black;
    textAlign = typeof textAlign !== 'undefined' ? textAlign : "top";
    fontname = typeof fontname !== 'undefined' ? fontname : "sans-serif";
    fontsize = typeof fontsize !== 'undefined' ? fontsize : "20px";

    this._canvasContext.save();
    this._canvasContext.scale(canvasScale.x, canvasScale.y);
    this._canvasContext.translate(position.x - origin.x, position.y - origin.y);
    this._canvasContext.textBaseline = 'top';
    this._canvasContext.font = fontsize + " " + fontname;
    this._canvasContext.fillStyle = color.toString();
    this._canvasContext.textAlign = textAlign;
    this._canvasContext.fillText(text, 0, 0);
    this._canvasContext.restore();
};

var Canvas2D = new Canvas2D_Singleton();
