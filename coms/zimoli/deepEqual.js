var singleEqual = function (o1, o2) {
    return o1 === o2 || isNumber(o1) && isNumber(o2) && isNaN(o1) && isNaN(o2);
};
var deepEqualMarkLabel = "__zimo1i_deep_equal_mark_label";
var restcompare = [];
var ALLOW_CACHE_LENGTH = SAFE_CIRCLE_DEPTH * 1024;
var ALLOW_REST_DEPTH = 16;
var count = 0, inc = 0;
var checkMemery = function (msg) {
    var used = count + restcompare.length;
    if (used > ALLOW_CACHE_LENGTH) {
        inc += used / ALLOW_CACHE_LENGTH | 0;
        count = used % ALLOW_CACHE_LENGTH;
        if (inc >= ALLOW_REST_DEPTH) {
            console.warn("对象过大，deepEqual未能完成比对");
            return false;
        }
        console.warn(msg);
    }
    return true;
}
var objectEqual = function (o1, o2, deep) {
    if (o1.constructor !== o2.constructor) return false;
    var keys1 = Object.keys(o1), keys2 = Object.keys(o2);
    if (keys1.length !== keys2.length) return false;
    keys1.sort(), keys2.sort();
    var restkeys = [];
    for (var cx = 0, dx = keys1.length; cx < dx; cx++) {
        var k = keys1[cx];
        if (keys2[cx] !== k) return false;
        var v1 = o1[k], v2 = o2[k];
        if (v1 instanceof Object && v2 instanceof Object) {
            if (v1 !== v2) restkeys.push(k);
            continue;
        }
        if (!singleEqual(v1, v2)) return false;
    }
    count += keys1.length;
    if (!checkMemery("对象过大，deepEqual将消耗更多的时间")) return false;
    if (restkeys.length && !(o1[deepEqualMarkLabel] && o2[deepEqualMarkLabel])) {
        for (var cx = 0, dx = restkeys.length; cx < dx; cx++) {
            var k = restkeys[cx];
            if (!checkMemery("深层对象过多，deepEqual将消耗更多的内存")) return false;
            restcompare.push(o1[k], o2[k], deep + 1);
        }
    }
    if (o1.valueOf instanceof Function && o2.valueOf instanceof Function) {
        var v1 = o1.valueOf(), v2 = o2.valueOf();
        if (!(v1 instanceof Object && v2 instanceof Object)) return singleEqual(v1, v2);
    }
    try {
        if (deep === 0 && o1.toString instanceof Function && o2.toString instanceof Function) return o1.toString() === o2.toString();
    } catch (e) {
        console.warn(e);
    }
    return true;
};
function deepEqual(o1, o2) {
    if (o1 instanceof Object && o2 instanceof Object) {
        var result = objectEqual(o1, o2, 0);
        if (result) for (var cx = 0; cx < restcompare.length; cx += 3) {
            var v1 = restcompare[cx], v2 = restcompare[cx + 1], deep1 = restcompare[cx + 2];
            if (!objectEqual(v1, v2, deep1)) {
                result = false;
                break;
            }
            v1[deepEqualMarkLabel] = true;
            v2[deepEqualMarkLabel] = true;
        }
        while (cx > 0) {
            cx -= 3;
            var v1 = restcompare[cx], v2 = restcompare[cx + 1];
            delete v1[deepEqualMarkLabel];
            delete v2[deepEqualMarkLabel];
        }
        restcompare = [];
        inc = 0, count = 0;
        return result;
    } else {
        return singleEqual(o1, o2);
    }
}