"use strict";

function handleMouseMove(evt) {
    var canvasScale = Canvas2D.scale;
    var mx, my;

    // Inverse of translate(-50%,-50%) rotate(90deg) around screen center.
    if (window.SNUKER_EMBED && Canvas2D._snukerRotated) {
        var cx = window.innerWidth / 2;
        var cy = window.innerHeight / 2;
        var boxW = Canvas2D._snukerBoxW || Canvas2D._canvas.width;
        var boxH = Canvas2D._snukerBoxH || Canvas2D._canvas.height;
        var lx = evt.pageY - cy + boxW / 2;
        var ly = cx - evt.pageX + boxH / 2;
        mx = lx / canvasScale.x;
        my = ly / canvasScale.y;
    } else {
        var canvasOffset = Canvas2D.offset;
        mx = (evt.pageX - canvasOffset.x) / canvasScale.x;
        my = (evt.pageY - canvasOffset.y) / canvasScale.y;
    }
    Mouse._position = new Vector2(mx, my);
}

function handleMouseDown(evt) {
    handleMouseMove(evt);

    if (evt.which === 1) {
        if (!Mouse._left.down)
            Mouse._left.pressed = true;
        Mouse._left.down = true;
    } else if (evt.which === 2) {
        if (!Mouse._middle.down)
            Mouse._middle.pressed = true;
        Mouse._middle.down = true;
    } else if (evt.which === 3) {
        if (!Mouse._right.down)
            Mouse._right.pressed = true;
        Mouse._right.down = true;
    }
}

function handleMouseUp(evt) {
    handleMouseMove(evt);

    if (evt.which === 1)
        Mouse._left.down = false;
    else if (evt.which === 2)
        Mouse._middle.down = false;
    else if (evt.which === 3)
        Mouse._right.down = false;
}

function handleTouchAsMouse(evt, phase) {
    if (!evt.changedTouches || evt.changedTouches.length === 0) return;
    var t = evt.changedTouches[0];
    var fake = { pageX: t.pageX, pageY: t.pageY, which: 1 };
    if (phase === "move") {
        handleMouseMove(fake);
    } else if (phase === "start") {
        handleMouseDown(fake);
    } else if (phase === "end") {
        handleMouseUp(fake);
    }
    if (evt.cancelable) evt.preventDefault();
}

function Mouse_Singleton() {
    this._position = Vector2.zero;
    this._left = new ButtonState();
    this._middle = new ButtonState();
    this._right = new ButtonState();
    document.onmousemove = handleMouseMove;
    document.onmousedown = handleMouseDown;
    document.onmouseup = handleMouseUp;
    document.addEventListener("touchstart", function (e) { handleTouchAsMouse(e, "start"); }, { passive: false });
    document.addEventListener("touchmove", function (e) { handleTouchAsMouse(e, "move"); }, { passive: false });
    document.addEventListener("touchend", function (e) { handleTouchAsMouse(e, "end"); }, { passive: false });
    document.addEventListener("touchcancel", function (e) { handleTouchAsMouse(e, "end"); }, { passive: false });
}

Object.defineProperty(Mouse_Singleton.prototype, "left",
    {
        get: function () {
            return this._left;
        }
    });

Object.defineProperty(Mouse_Singleton.prototype, "middle",
    {
        get: function () {
            return this._middle;
        }
    });

Object.defineProperty(Mouse_Singleton.prototype, "right",
    {
        get: function () {
            return this._right;
        }
    });

Object.defineProperty(Mouse_Singleton.prototype, "position",
    {
        get: function () {
            return this._position;
        }
    });

Mouse_Singleton.prototype.reset = function () {
    this._left.pressed = false;
    this._middle.pressed = false;
    this._right.pressed = false;
};

Mouse_Singleton.prototype.containsMouseDown = function (rect) {
    return this._left.down && rect.contains(this._position);
};

Mouse_Singleton.prototype.containsMousePress = function (rect) {
    return this._left.pressed && rect.contains(this._position);
};

var Mouse = new Mouse_Singleton();
