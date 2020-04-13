"use strict";
var window = this;
// delete window.Promise;
var {
    parseInt,
    XMLHttpRequest,
    ActiveXObject,
    isProduction = function develop() { return develop.name !== 'develop'; }(),
    Error,
    Function,
    Array,
    Promise,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    navigator,
    document,
    top,
    location,
    console,
    efrontURI,
    parseFloat,
    PREVENT_FRAMEWORK_MODE,
    startPath: efrontPath,
    request = function (url, onload, onerror) {
        var version = versionTree[url] || (+new Date).toString(32);
        var xhr = XHR();
        xhr.open("POST", url);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                var status = xhr.status;
                if (status === 0 || status === 200 || status === 304) {
                    onload(xhr.responseText);
                } else {
                    onerror(xhr.responseText);
                }
            }
        };
        xhr.send(version);
    },
    pixelDecoder // = d => d / 16 + "rem"
} = window;
//去除外层广告
if (PREVENT_FRAMEWORK_MODE !== false) {
    var message = '请关闭后重新打开..';
    try {
        if (top && top !== window && !/MSIE/.test(navigator.userAgent)) {
            top.location.href = window.location.href;
        }
    } catch (e) {
        document.write(message);
        top.location.reload();
        throw message;
    }
}
var start_time = +new Date / 1000 | 0;

var FILE_NAME_REG = /^https?\:|\.(html?|css|asp|jsp|php)$/i;
// 适配大小屏
var devicePixelRatio = window.devicePixelRatio || 1;
// if (isBadDevice) devicePixelRatio = 1;
var renderPixelRatio = !/win/i.test(navigator.platform) && devicePixelRatio > 1 && window.innerWidth > 360 && window.innerHeight > 360 ? .86 : .75;
if (document.querySelector && devicePixelRatio > 1 && /Linux/.test(navigator.platform) && navigator.maxTouchPoints > 0) {
    let ratio = +(1000000 / devicePixelRatio + .5 | 0) / 1000000;
    document.querySelector("meta[name=viewport]").setAttribute("content", `width=device-width,target-densitydpi=device-dpi,user-scalable=no,initial-scale=1,maximum-scale=${ratio}`);
    renderPixelRatio *= devicePixelRatio;
    devicePixelRatio = 1;
}
var initPixelDecoder = function () {
    if (pixelDecoder instanceof Function) {
        modules.fromPixel = pixelDecoder;
        modules.freePixel = window.freePixel || function () {
            throw new Error("您在window上实现了pixelDecoder，请手动实现相应的freePixel!");
        };
        modules.calcPixel = window.calcPixel || function () {
            throw new Error("您在window上实现了pixelDecoder，请手动实现相应的calcPixel!");
        };
        modules.fromOffset = window.fromOffset || function () {
            throw new Error("您在window上实现了pixelDecoder，请手动实现相应的fromOffset!");
        };
        modules.freeOffset = window.freeOffset || function () {
            throw new Error("您在window上实现了pixelDecoder，请手动实现相应的freeOffset!");
        };
        return;
    }
    var maxRenderWidth = +document.body.getAttribute('max-render');
    if (!maxRenderWidth || /msie\s+[2-8]/i.test(navigator.userAgent)) {
        /**
         * 从px到pt
         */
        modules.fromPixel = pixelDecoder = d => d * renderPixelRatio + "pt";

        /**
         * 从offset到pt
         */
        modules.fromOffset = d => pixelDecoder(freePixel(d));
        /**
         * 从pt 到 offset
         */
        modules.freeOffset = d => calcPixel(parseFloat(d) / renderPixelRatio);
        /**
         * 从offset到px
         */
        var freePixel = modules.freePixel = d => d * .75 / renderPixelRatio;
        /**
         * 从pixel到offset
         */
        var calcPixel = modules.calcPixel = d => d * renderPixelRatio / .75;
        document.documentElement.style.fontSize = `${16 * renderPixelRatio}pt`;
    } else {
        /**
         * 从px到rem
         */
        modules.fromPixel = pixelDecoder = d => d / 16 + "rem";
        /**
         * 从offset到rem
         */
        modules.fromOffset = d => freePixel(d) / 16 + "rem";
        /**
         * 从rem 到 offset
         */
        modules.freeOffset = d => calcPixel(parseFloat(d) * 16);
        /**
         * 从offset到px
         */
        var freePixel = modules.freePixel = d => window.innerWidth * .75 < maxRenderWidth * renderPixelRatio ? d * .75 / renderPixelRatio : d * .75 / (window.innerWidth / maxRenderWidth * renderPixelRatio);
        /**
         * 从pixel到offset
         */
        var calcPixel = modules.calcPixel = d => window.innerWidth * .75 < maxRenderWidth * renderPixelRatio ? d * renderPixelRatio / .75 : d * renderPixelRatio / (maxRenderWidth / window.innerWidth * .75);
        init("css", function (css) {
            var onresize = function () {
                var fontSize = window.innerWidth * .75 < maxRenderWidth * renderPixelRatio ? 16 * renderPixelRatio + "pt" : window.innerWidth / maxRenderWidth * renderPixelRatio * 16 + "pt";
                css("html", {
                    fontSize
                });
            };
            onresize();
            init("on", function (on) {
                on("resize")(window, onresize);
            });
        });
    }
};

var loaddingTree = {};
var responseTree = {};
var versionTree = {};
var forceRequest = {};
var circleTree = {};
var warnedModules = {};
var hasOwnProperty = {}.hasOwnProperty;
var XHR = function () {
    return new (XMLHttpRequest || ActiveXObject)("Microsoft.XMLHTTP");
};
var loaddata = function (name) {
    var url;
    if (FILE_NAME_REG.test(name)) url = name;
    else {
        switch (name.charAt(0)) {
            case ":":
                url = "node/" + name.slice(1);
                break;
            case "/":
                url = "page" + name;
                break;
            case ".":
                url = "ccon/" + name.slice(1);
                break;
            default:
                url = "comm/" + name;
        }
        if (efrontURI) url = efrontURI + url;
    }
    var count = /msie\s?[2-8]/i.test(navigator.userAgent) ? 20 : 2;
    var run = function () {
        count--;
        if (count < 0) {
            throw new Error("加载" + name + "出错！");
        };
        request(url, function (responseText) {
            responseTree[name] = responseText;
            flush(name);
        }, function () {
            setTimeout(run, parseInt(Math.random() * (20 - count) * 20));
        });
    };
    run();
};
var flush_to_storage_timer = 0,
    responseTree_storageKey = "zimoliAutoSavedResponseTree" + location.pathname;
var saveResponseTreeToStorage = function () {
    var responseTextArray = [];
    for (var k in responseTree) {
        if (versionTree[k]) responseTextArray.push(
            k + "：" + versionTree[k] + "：" + responseTree[k]
        );
    }
    var data = responseTextArray.join("，");
    localStorage && localStorage.setItem(responseTree_storageKey, data);
};
var loadResponseTreeFromStorage = function () {
    function table(sign) {
        var c, table = new Array(256);
        for (var n = 0; n < 256; n++) {
            c = n;
            c = c & 1 ? sign ^ c >>> 1 : c >>> 1;
            c = c & 1 ? sign ^ c >>> 1 : c >>> 1;
            c = c & 1 ? sign ^ c >>> 1 : c >>> 1;
            c = c & 1 ? sign ^ c >>> 1 : c >>> 1;
            c = c & 1 ? sign ^ c >>> 1 : c >>> 1;
            c = c & 1 ? sign ^ c >>> 1 : c >>> 1;
            c = c & 1 ? sign ^ c >>> 1 : c >>> 1;
            c = c & 1 ? sign ^ c >>> 1 : c >>> 1;
            table[n] = c;
        }
        return table;
    }

    function crc(bstr, seed) {
        var C = seed ^ -1,
            L = bstr.length - 1;
        for (var i = 0; i < L;) {
            C = C >>> 8 ^ T[(C ^ bstr.charCodeAt(i++, 36)) & 0xFF];
            C = C >>> 8 ^ T[(C ^ bstr.charCodeAt(i++, 36)) & 0xFF];
        }
        if (i === L) C = C >>> 8 ^ T[(C ^ bstr.charCodeAt(i)) & 0xFF];
        return C ^ -1;
    }

    var sign = parseInt("-52l3vk", 36);
    var T = table(sign);
    var load = function (name) {
        var data = localStorage.getItem(responseTree_storageKey);
        if (!data) return;
        var responseTextArray = data.split("，");
        for (var cx = 0, dx = responseTextArray.length; cx < dx; cx++) {
            var kv = responseTextArray[cx].split("：");
            var [responseName, version, responseText] = kv;
            preLoadVersionTree[responseName] = version;
            preLoadResponseTree[responseName] = responseText;
        }
    };
    var preLoadResponseTree = {};
    var preLoadVersionTree = {};
    if (localStorage) load();
    else init("localStorage", function (_localStorage) {
        localStorage = _localStorage;
        load();
    });
    preLoad = function (responseName) {
        if (responseTree[responseName]) return;
        var version = preLoadVersionTree[responseName]
        if (!version) return;
        var responseText = preLoadResponseTree[responseName]
        var sum = crc(responseText).toString(36);
        if (sum + version.slice(sum.length) === versionTree[responseName])
            responseTree[responseName] = responseText;
        // else window.console.log(responseName, sum, version, versionTree[responseName]);
    };
};
var preLoad = function () { };
var flush = function (url) {
    clearTimeout(flush_to_storage_timer);
    var thens = loaddingTree[url];
    delete loaddingTree[url];
    for (var k in thens) {
        var then = thens[k];
        if (then instanceof Function) {
            then(responseTree[url], url);
        }
    }
    flush_to_storage_timer = setTimeout(saveResponseTreeToStorage, 260);
};
var get = function (url, then) {
    preLoad(url);
    if (responseTree[url]) {
        then(responseTree[url], url);
    } else if (loaddingTree[url]) {
        loaddingTree[url].push(then);
    } else {
        loaddingTree[url] = [then];
        loaddata(url);
    }
};
var penddingTree = {};
var getArgs = function (text) {
    var functionArgs, functionBody;
    //依赖项名称部分的长度限制为36*36*18=23328
    var doublecount = parseInt(text.slice(0, 3), 36);
    if (doublecount >> 1 << 1 === doublecount) {
        var dependencesCount = doublecount >> 1;
        var dependenceNamesOffset = 3 + dependencesCount;
        var dependenceNames = text.slice(3, dependenceNamesOffset);
        functionArgs = dependenceNames ? dependenceNames.split(",") : [];
        functionBody = text.slice(dependenceNamesOffset);
    } else {
        functionArgs = [];
        functionBody = text;
    }
    functionBody = functionBody.replace(/^(?:\s*(["'])user? strict\1;?[\r\n]*)?/i, "\"use strict\";\r\n");
    functionBody = functionBody.replace(/(\:\s*)?((?:\d*\.)?\d+)px(\s*\))?/ig, (m, h, d, quote) => (h || "") + (d !== '1' ? h && quote ? renderPixelRatio * d + "pt" : pixelDecoder(d) : renderPixelRatio > 1 ? ".75pt" : 0.75 / devicePixelRatio + "pt") + (quote || ""));
    return [functionArgs, functionBody];
};
var get_relatives = function (name, required) {
    var required_base = name.replace(/[^\/\$]+$/, "");
    required_base = required_base.replace(/^\.?[\/\$]+/, "");
    var is_page = /^\//.test(name);
    return required.map(r => {
        var base = required_base;
        if (/^\.*[\/]/.test(r)) {
            r = r.replace(/^\.\//, '');
            while (/\.\.[\/\$]/.test(r)) {
                base = base.replace(/[^\/\$]*[\/\$]$/, '');
                r = r.slice(3);
            }
            base = base.replace(/^[\/\$]/, '');
            if (/^\//.test(r)) {
                base = '';
                r = r.slice(1);
            }
            if (is_page) {
                base = "/" + base;
            } else {
                base = base.replace(/\//g, "$");
                r = r.replace(/\//g, '$');
            }
            return base + r;
        }
        return r.replace(/\//g, '$');
    });
};
var createFunction = function (name, body, args) {
    return window.eval(`(function /*${name}*/(${args || ''}){\r\n${body}\r\n})`);
};
var executer = function (text, name, then, prebuild, parents) {
    var [functionArgs, functionBody] = getArgs(text);
    if (!functionArgs.length) {
        if (prebuild && hasOwnProperty.call(prebuild, name)) return then(prebuild[name]);
        if (hasOwnProperty.call(modules, name)) return then(modules[name]);
        var exports = createFunction(name, functionBody).call(window);
        then(modules[name] = exports);
        return;
    }

    var requires = functionArgs.slice(0, functionArgs.length >> 1);
    if (!parents) {
        parents = [];
    }
    if (!parents.indexOf) console.log(parents);
    var index = parents.indexOf(name);
    if (index >= 0) {
        if (!circleTree[name]) {
            var circle = parents.slice(index).concat(name);
            parents.forEach(key => circleTree[key] = circle);
        }

    }
    if (circleTree[name]) {
        var circle = circleTree[name];
        if (!circle[name]) {
            circle[name] = text;
        }
        if (!circle[-1]) {
            circle[-1] = 0
        }
        circle[-1]++;
        if (!circle[-2]) circle[-2] = [];
        circle[-2].push([text, name, then, prebuild, parents]);
        if (circle[-1] < circle.length) {
            return;
        }
        return killCircle(circle);
    }

    init(requires, function (args) {
        // 如果构造该对象没有依赖预置树中的对象，保存这个对象到全局单例对象，否则保存这个对象到预置树
        if (prebuild && hasOwnProperty.call(prebuild, name)) return then(prebuild[name]);
        var prevent_save = 0;
        var argslength = functionArgs.length >> 1;
        prebuild && [].forEach.call(requires, k => k in prebuild && prevent_save++);
        if (!prevent_save && hasOwnProperty.call(modules, name)) return then(modules[name]);
        if (!isProduction) if (prevent_save && /^\w+$/.test(name) && !warnedModules[name]) {
            warnedModules[name] = true;
            console.info(`%c组件对象 %c${name}%c 在多实例的模式下运行！`, "color:#333;", "color:#c28", "color:#333");
        }
        var allArgumentsNames = functionArgs.slice(argslength, argslength << 1);
        var indexOf_exports = requires.indexOf("exports"),
            indexOf_module = requires.indexOf("module"),
            indexOf_require = requires.indexOf("require"),
            indexOf_define = requires.indexOf("define");
        var _this = window;
        if (~indexOf_define) {
            _this = args[indexOf_define];
            args[indexOf_define] = args[indexOf_require] || function (m_name, requires, exec) {
                if (m_name instanceof Function) {
                    exec = m_name;
                    return exec.call(_this);
                }
                if (m_name instanceof Array) {
                    exec = requires;
                    requires = m_name;
                    m_name = name;
                }
                if (!/^\//.test(m_name)) {
                    m_name = m_name.replace(/\//g, '$');
                }
                init(get_relatives(m_name, requires), function (args) {
                    return exec.apply(_this, args);
                }, prebuild, m_name === name ? parents : parents.concat(m_name), prebuild);
            };
            args[indexOf_define].amd = true;
        }
        if (~indexOf_exports) {
            _this = args[indexOf_exports];
        } else if (~indexOf_module) {
            _this = args[indexOf_module].exports;
        }
        var hire = function () {
            var exports = createFunction(name, functionBody, allArgumentsNames).apply(_this, args.concat([allArgumentsNames]));
            if (prevent_save) prebuild[name] = exports;
            else modules[name] = exports;
            then(exports);
        };
        if (~indexOf_require) {
            var require = args[indexOf_require];
            var required = functionArgs[argslength << 1];
            if (require) {
                if (required) {
                    required = get_relatives(name, required.split(';'));
                    args[indexOf_require] = function (i) {
                        return require(required[i]);
                    };
                }
                hire();
                return;
            }
            args[indexOf_require] = function (refer) {
                return required[refer];
            };
            if (required) {
                required = get_relatives(name, required.split(';'));
                init(required, function (args) {
                    required = args;
                    hire();
                }, prebuild, parents.concat(name));
            } else {
                hire();
            }
            return;
        }
        hire();
    }, prebuild, parents.concat(name));
};
var JSON_parser = function (text, name, then) {
    init('JSON', function (JSON) {
        var data = modules[name] || JSON.parse(text);
        if (!/\?/.test(name)) {
            modules[name] = data;
        }
        then(data);
    });
};

var killCircle = function (circle) {
    // 文件存在环形引用
    circle.map(key => modules[key] = delete circleTree[key]);
    console.error(`代码文件存在环形引用，未能成功加载:[ ${circle.join(" >> ")} ]`);
};
var noop = function (text, name, then) {
    then(text);
};
var broadcast = function (text, name) {
    var adapter;
    if (FILE_NAME_REG.test(name)) {
        if (/\.json([\#\?].*?)?$/i.test(name)) {
            adapter = JSON_parser;
        } else if (FILE_NAME_REG.test(name)) {
            adapter = noop;
        }
    } else switch (name.charAt(0)) {
        case ".":
            adapter = noop;
            break;
        default:
            adapter = executer;
    }
    var thens = penddingTree[name];
    delete penddingTree[name];
    for (var cx = 0, dx = thens.length; cx < dx; cx++) {
        var [then, prebuild, parents] = thens[cx];
        adapter(text, name, then, prebuild, parents);
    }
};
var bindthen = function (callback) {
    return function (data) {
        if (Promise && data instanceof Promise) {
            data.then(callback);
        } else {
            callback(data);
        }
    };
};
var init = function (name, then, prebuild, parents) {
    then = bindthen(then);
    if (name instanceof Array) {
        if (!Promise) console.log(name, Promise, preLoad, parents);
        var exports = {}, module = { exports };
        return Promise.all(name.map(function (argName) {
            if (prebuild && argName in prebuild) {
                return prebuild[argName];
            }
            if (argName === "module") return module;
            if (argName === "exports") return exports;
            if (/^(?:window|require|define|global|undefined)$/.test(argName)) return window[argName];
            return new Promise(function (ok, oh) {
                init(argName, ok, prebuild, parents);
            });
        })).then(function (args) {
            (then instanceof Function) && then(args);
        });
    }
    if (modules[name]) {
        return then(modules[name]);
    }
    if (!forceRequest[name] && window[name]) {
        modules[name] = window[name];
        return then(modules[name]);
    }
    if (penddingTree[name]) {
        return penddingTree[name].push([then, prebuild, parents]);
    }
    penddingTree[name] = [
        [then, prebuild, parents]
    ];
    // return 
    get(name, broadcast);
};

var requires_count = 3;
var hook = function (requires_count) {
    if (requires_count !== 0) return;
    "alert confirm innerWidth innerHeight".split(/\s+/).map(removeGlobalProperty);
    loadResponseTreeFromStorage();
    initPixelDecoder();
    modules.Promise = Promise;
    modules.hook_time = +new Date;
    if (!efrontPath) efrontPath = document.body.getAttribute("main-path") || document.body.getAttribute("path") || document.body.getAttribute("main") || "zimoli";
    init(efrontPath, function (zimoli) {
        if (zimoli instanceof Function) zimoli();
    });
};
var initIfNotDefined = function (defined, path, onload) {
    if (defined === void 0) init(path, a => onload(a) | hook(--requires_count));
    else hook(--requires_count);
}
var modules = {
    isProduction,
    start_time,
    MOVELOCK_DELTA: 3 * renderPixelRatio,
    SAFE_CIRCLE_DEPTH: 300,
    init,
    versionTree,
    responseTree,
    loaddingTree,
    load: loaddata,
    XHR,
    devicePixelRatio,
    renderPixelRatio,
    debug() {
        document.addEventListener("blur", e => e.stopPropagation(), true);
    },
    put(name, module) {
        modules[name] = module;
    },
    setGetMethod(_get) {
        get = _get;
    },
};
modules.modules = modules;
try {
    var localStorage = window.localStorage;
} catch (e) {
    localStorage = {
        getItem() { },
        setItem() { },
        clear() { }
    };
    modules.localStorage = modules.sessionStorage = localStorage;
}

initIfNotDefined(Promise, "Promise", promise => Promise = promise);
initIfNotDefined([].map, "[]map", map => map);
var removeGlobalProperty = function (property) {
    forceRequest[property] = true;
};
var onload = function () {
    window.onload = null;
    hook(--requires_count);
};
if (document.body) onload();
else window.onload = onload;