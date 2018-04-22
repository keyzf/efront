var _label = label();
var track = createElement(div);
track.className = "track";
_label.className = "label";

var btn = div();
btn.tabIndex = 0;
function button(texter, type) {
    var tracker = createElement(track);
    var _texter;
    if (isNode(texter)) {
        _texter = texter;
    } else {
        _texter = createElement(_label);
        if (isString(texter))
            text(_texter, texter);
    }
    var button = createElement(btn, tracker, _texter);
    var hover = function () {
        addClass(button, "hover");
    };
    var active = function () {
        addClass(button, "active hover");
    };
    var resethover = function () {
        removeClass(button, "hover");
    };
    var resetactive = function () {
        removeClass(button, "active");
    };
    var resetall = function () {
        removeClass(button, "active hover");
    }
    onremove(button, resetall);
    onmouseover(button, hover);
    onmouseleave(button, function () {
        removeClass(button, "hover");
    });
    onmousemove(button, function (event) {
        if (onclick.preventClick && event.which) resetall();
    });
    onmousedown(button, function () {
        var cancelmouseup = onmouseup(window, function () {
            cancelmouseup();
            resetactive();
        });
        active();
    });
    ontouchmove(button, resetall);
    ontouchstart(button, function () {
        var cancel = function () {
            canceltouchcancel();
            canceltouchend();
            resetall();
        };
        var canceltouchcancel = ontouchcancel(window, cancel);
        var canceltouchend = ontouchend(window, cancel);
        active();
    });
    button.text = function (_text) {
        if (_text && _text.length === 2) {
            addClass(button, "space");
        } else {
            removeClass(button, "space");
        }
        if (arguments.length)
            return text(_texter, _text);
        return text(_texter);
    };
    if (texter && texter.length === 2) {
        addClass(button, "space");
    } else {
        removeClass(button, "space");
    }
    if (type) button.setAttribute("type", type);
    return button;
};