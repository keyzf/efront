var abs = Math.abs;
var sqrt = Math.sqrt;
var sign = Math.sign || function (a) {
    return +a > 0 ? 1 : -a > 0 ? -1 : 0;
};
var pow = Math.pow;
var box = createElement(div);
css(box, "overflow:hidden;height:100%");
var extendTouch = function (e) {
    var touch = e.touches[0];
    for (var k in touch) {
        if (!e[k]) e[k] = touch[k];
    }
    return e;
};
/**
 * vbox 纵向滑动框
 * 传入一个页面，将其重构为可纵向平滑滑动的页面
 * @param {Element|Function|string} generator 
 */
function vbox(generator) {
    var _box;
    if (isNode(generator)) {
        _box = generator;
        _box.style.cssText = box.style.cssText + _box.style.cssText;
    } else {
        _box = createElement(box);
    }
    _box.height = function () {
        return _box.offsetHeight;
    };
    _box.width = function () {
        return _box.offsetWidth;
    };
    isFunction(generator) && generator(_box);
    var totalHeight = _box.Height = _box.Height || function () {
        return _box.scrollHeight;
    };
    var currentTop = _box.Top = _box.Top || function (top) {
        if (isNumber(top)) {
            _box.scrollTop = top;
        }
        return _box.scrollTop;
    };
    _box.scroll = function (deltay, useIncrease = true) {
        var top = currentTop() + deltay;
        var height = _box.height();
        var scrollHeight = totalHeight();
        if (top < 0) {
            // if (speed > 30) speed = 30;
            speed = speed >> 1;
            useIncrease && increase(top);
            top = 0;
        } else if (top + height > scrollHeight) {
            // if (speed > 30) speed = 30;
            speed = speed >> 1;
            useIncrease && increase(top + height - scrollHeight);
        }
        return currentTop(top);
    };
    var saved_x, saved_y, direction, speed = 0,
        lastmoveTime;
    var smooth = function (useIncrease = true) {
        var abs_speed = abs(speed << 2) / time_splitter;
        if (abs_speed < 1) {
            speed = 0;
            decrease();
            return;
        }
        speed_timer = setTimeout(smooth, time_splitter);
        _box.scroll(-speed, useIncrease);
        speed = speed - sign(speed) * (abs_speed - sqrt(abs_speed) * sqrt(abs_speed - 1));
    };
    var increaser_t = createElement(div);
    var increaser_b = createElement(div);
    var decrease_timer = 0;
    var time_splitter = 30;
    var _decrease = function (increaser) {
        var height = parseInt(increaser.style.height);
        if (height > 1) {
            var scrollTop = currentTop();
            if (scrollTop > 0 && _box.childNodes[0] === increaser) {
                var deltaY = scrollTop > height ? height : scrollTop;
                height -= deltaY;
                currentTop(scrollTop - deltaY);
            }
            var tH = totalHeight();
            var bH = _box.height();
            if (scrollTop + bH < tH && _box.childNodes[_box.childNodes.length - 1] === increaser) {
                var deltaY = tH - bH - scrollTop > height ? height : tH - bH - scrollTop;
                height -= deltaY;
            }
            css(increaser, {
                height: (height > 16 ? (height * 2 + 6) / 3 : height >> 1) + "px"
            });
            return 1;
        }
        remove(increaser);
        return 0;
    }
    var decrease = function () {
        if (_decrease(increaser_t) + _decrease(increaser_b)) decrease_timer = setTimeout(decrease, time_splitter);
    };
    var increase = function (deltaY) {
        var t_height = parseInt(increaser_t.style.height) || 0;
        var b_height = parseInt(increaser_b.style.height) || 0;
        t_height -= deltaY;
        b_height += deltaY;
        if (deltaY < 0 && t_height > 0) {
            _box.insertBefore(increaser_t, _box.childNodes[0] || null);
        } else if (deltaY > 0 && b_height > 0) {
            appendChild(_box, increaser_b);
        }
        var total_height = 100;
        if (b_height > total_height) b_height = total_height;
        if (t_height > total_height) t_height = total_height;
        if (b_height < 0) b_height = 0;
        if (t_height < 0) t_height = 0;
        b_height && css(increaser_b, {
            height: b_height + "px"
        });
        t_height && css(increaser_t, {
            height: t_height + "px"
        });
    };
    onmousewheel(_box, function (event) {
        clearTimeout(speed_timer);
        clearTimeout(decrease_timer);
        var deltay = isNumber(event.deltaY) ? -event.deltaY : event.wheelDeltaY;
        !isNumber(deltay) && (deltay = event.wheelDelta);
        !isNumber(deltay) && (deltay = -event.detail * 40);
        event.preventDefault();
        var now = new Date;
        var deltat = now - lastmoveTime;
        lastmoveTime = now;
        speed = speed ? (speed + deltay * time_splitter / deltat) >> 1 : deltay * time_splitter / deltat;
        _box.scroll(-deltay, false);
        smooth(false);
    });
    var speed_timer, cancelmousemove, cancelmouseup;
    onmousedown(_box, function (event) {
        clearTimeout(speed_timer);
        clearTimeout(decrease_timer);
        speed = 0;
        lastmoveTime = new Date;
        saved_x = event.clientX, saved_y = event.clientY;
        direction = 0;
        var body = document.body;
        cancelmousemove = onmousemove(body, mousemove);
        cancelmouseup = onmouseup(body, mouseup);
    });
    var mousemove = function (event) {
        if (event.defaultPrevented) return;
        if (event.type !== "touchmove" && event.which === 0) return mouseup();
        var clientX = event.clientX;
        var clientY = event.clientY;
        var deltax = clientX - saved_x;
        var deltay = clientY - saved_y;
        if (!direction) {
            if (abs(deltax) < 3 && abs(deltay) < 3) return;
            direction = abs(deltax) >= abs(deltay) ? -1 : 1;
        }
        if (direction < 0)
            return;
        event.preventDefault();
        var now = new Date;
        var deltat = now - lastmoveTime;
        lastmoveTime = now;
        speed = speed ? (speed + deltay * time_splitter / deltat) >> 1 : deltay * time_splitter / deltat;
        _box.scroll(-deltay);
        saved_x = clientX;
        saved_y = clientY;
    };
    var mouseup = function () {
        direction = 0;
        cancelmousemove();
        cancelmouseup();
        smooth();
    };

    ontouchstart(_box, function (event) {
        clearTimeout(speed_timer);
        clearTimeout(decrease_timer);
        extendTouch(event);
        lastmoveTime = new Date;
        saved_x = event.clientX, saved_y = event.clientY;
        var moving = event.target;
        speed = 0;
        direction = 0;
        var cancel = function () {
            direction = 0;
            canceltouchmove();
            canceltouchend();
            canceltouchcancel();
            smooth();
        };
        var canceltouchmove = ontouchmove(moving, function (event) {
            extendTouch(event);
            mousemove(event);
        });
        var canceltouchcancel = ontouchcancel(moving, cancel);
        var canceltouchend = ontouchend(moving, cancel);
    });
    return _box;
}