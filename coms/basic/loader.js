"use strict";
var window = this;
var {
    parseInt,
    XMLHttpRequest,
    ActiveXObject,
    isProduction = function develop() { return develop.name !== 'develop'; }(),
    Error,
    Function,
    Array,
    localStorage,
    Promise,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    navigator,
    document,
    top,
    location,
    Object,
    console,
    efrontURI,
    parseFloat,
    PREVENT_FRAMEWORK_MODE,
    devicePixelRatio = 1,
    startPath: efrontPath,
    pixelDecoder // = d => d / 16 + "rem"
} = window;

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

var request = window.request || function (url, onload, onerror) {
    var version = versionTree[url] || (+new Date).toString(32);
    var xhr = new (XMLHttpRequest || ActiveXObject)("Microsoft.XMLHTTP");
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
};
var loadingTree = {};
var responseTree = {};
var versionTree = {};

var keyprefix = ":";
var flushTree = function (tree, key, res) {
    var response = tree[key];
    delete tree[key];
    if (res) tree[key] = res;
    if (response instanceof Array) {
        for (var cx = 0, dx = response.length; cx < dx; cx++) {
            var call = response[cx];
            if (call instanceof Function) {
                call();
            }
        }
    }
};
var readingCount = 0;
var readFile = function (names, then, saveas) {
    if (names instanceof Array) {
        names = names.slice(0);
        var loaded = 0;
        var callback = function () {
            if (++loaded === names.length) {
                then();
            }
        };
        if (!names.length) return then();
        names.forEach(function (name) {
            readFile(name, callback);
        });
        return;
    }
    var name = names;
    var key = keyprefix + name;
    if (key in responseTree) {
        then(responseTree[key]);
        return;
    }
    if (loadingTree[key] instanceof Array) {
        loadingTree[key].push(then);
        return;
    }
    loadingTree[key] = [then];
    var url;
    if (FILE_NAME_REG.test(name)) {
        url = name;
    } else {
        switch (name.charAt(0)) {
            case ":":
                url = "node/" + name.slice(1);
                break;
            case "/":
                url = "page" + name;
                break;
            default:
                url = "comm/" + name;
        }
        if (efrontURI) url = efrontURI + url;
    }

    readingCount++;
    request(url, function (res) {
        responseTree[key] = res;
        flushTree(loadingTree, key);
        clearTimeout(flush_to_storage_timer);
        flush_to_storage_timer = setTimeout(saveResponseTreeToStorage, 200);
        readingCount--;
        if (readingCount === 0) {
            killCircle();
        }
    });

};
var createFunction = function (name, body, args) {
    return window.eval(`(function /*${name}*/(${args || ''}){\r\n${body}\r\n})`);
};

var FILE_NAME_REG = /^https?\:|\.(html?|css|asp|jsp|php)$/i;
var loadedModules = {};
var killCircle = function () {
    var penddings = {}, circle = [], module_keys = [];
    for (var k in loadedModules) {
        if (k.slice(0, keyprefix.length) === keyprefix && loadedModules[k] instanceof Array) {
            var key = k.slice(keyprefix.length);
            var args = loadedModules[k].args;
            args.forEach(arg => {
                if (!penddings[arg]) {
                    penddings[arg] = [];
                }
                if (!penddings[arg][k]) {
                    penddings[arg][k] = true;
                    penddings[arg].push(key);
                }
            })
            circle.push(key);
            module_keys.push(k);
        }
    };
    if (!circle.length) return;
    while (circle.length) {
        var deleted = Object.create(null);
        var savedLength = circle.length;
        for (var cx = circle.length - 1; cx >= 0; cx--) {
            var arg = circle[cx];
            var deps = penddings[arg];
            if (!deps || !deps.length) {
                circle.splice(cx, 1);
                delete penddings[arg];
                deleted[arg] = true;
            }
        }
        if (savedLength === circle.length) {
            break;
        }
        circle.forEach(function (c) {
            var args = penddings[c];
            penddings[c] = args.filter(a => !deleted[a]);
        });
    }
    if (circle.length > 0) {
        circle = circle.sort((a, b) => {
            if (~penddings[b].indexOf(a)) return -1;
            if (~penddings[a].indexOf(b)) return 1;
            return 0;
        });
        circle = circle.map((a, cx) => {
            if (cx + 1 === circle.length) return a;
            var b = circle[cx + 1];
            if (~penddings[b].indexOf(a)) return a + "%c>>%c";
            return a + "%c^%c";
        });
        console.log.apply(console, [].concat.apply(
            [`代码文件存在环形引用，未能成功加载: \r\n[ >>%c${circle.join("")}%c ]`],
            circle.map(a => ['color:#fff;background:#c24', 'color:#333;background:transparent'])
        ));
    } else {
        var tree = {};
        module_keys.forEach(function (k) {
            var loading = tree[k] = loadedModules[k];
            loadedModules[k] = loading.mod;
        });
        module_keys.forEach(function (k) {
            flushTree(tree, k);
        });
    }
};
var loadModule = function (name, then, prebuilds = {}) {
    if (/^(?:module|exports|define|require|window|global|undefined|__dirname|__filename)$/.test(name)) return then();
    var hasOwnProperty = {}.hasOwnProperty;
    if ((name in prebuilds) || hasOwnProperty.call(modules, name) || (window[name] !== null && window[name] !== void 0 && !hasOwnProperty.call(forceRequest, name))
    ) return then();
    preLoad(name);
    var key = keyprefix + name;
    if (loadedModules[key] instanceof Function) {
        then();
        return;
    }
    if (loadedModules[key] instanceof Array) {
        loadedModules[key].push(then);
        return;
    }
    loadedModules[key] = [then];
    if (FILE_NAME_REG.test(name)) {
        var saveModule = function () {
            flushTree(responseTree, key, function () {
                return responseTree[key];
            });
        };
        if (/\.json([\#\?].*?)?$/i.test(name)) {
            readFile(["JSON", name], saveModule);
        } else {
            readFile(name, saveModule);
        };
    }
    else {

        var saveModule = function () {
            var data = responseTree[key];
            if (typeof data === "function") {
                var mod = data;
                flushTree(loadedModules, key, mod);
                return;
            }
            var [args, body] = getArgs(data);
            var argslength = args.length >> 1;
            var mod = createFunction(name, body, args.slice(argslength, argslength << 1));
            mod.args = args;
            var required = args[argslength << 1];
            var loadingCount = 0;
            if (required) required = required.split(';').filter(a => !!a);
            required = required ? get_relatives(name, required) : [];
            mod.required = required;
            mod.file = name;
            args = args.slice(0, argslength).concat(required);
            var response = function () {
                loadingCount++;
                if (loadingCount === args.length) {
                    flushTree(loadedModules, key, mod);
                }
            };
            if (!args.length) {
                flushTree(loadedModules, key, mod);
            } else {
                loadedModules[key].args = mod.args;
                loadedModules[key].mod = mod;
                args.forEach(function (moduleName) {
                    loadModule(moduleName, response, prebuilds);
                });
            }
        };
        readFile(name, saveModule);
    }
};
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
    if (pixelDecoder) functionBody = functionBody.replace(/(\:\s*)?((?:\d*\.)?\d+)px(\s*\))?/ig, (m, h, d, quote) => (h || "") + (d !== '1' ? h && quote ? renderPixelRatio * d + "pt" : pixelDecoder(d) : renderPixelRatio > 1 ? ".75pt" : 0.75 / devicePixelRatio + "pt") + (quote || ""));
    return [functionArgs, functionBody];
};
var get_relatives = function (name, required, prefix = "") {
    var required_base = name.replace(/[^\/\$]+$/, "");
    required_base = required_base.replace(/^\.?[\/\$]+/, "");
    var is_page = /^\//.test(name);
    return required.map(r => {
        var r1 = r;
        var base = required_base;
        if (/^\.*[\/]/.test(r1)) {
            r1 = r1.replace(/^\.\//, '');
            while (/\.\.[\/\$]/.test(r1)) {
                if (/^[\\\/\$\.]*$/.test(base)) {
                    break;
                }
                base = base.replace(/[^\/\$]*[\/\$]$/, '');
                r1 = r1.slice(3);
            }
            base = base.replace(/^[\/\$]/, '');
            if (/^\//.test(r1)) {
                base = '';
                r1 = r1.slice(1);
            }
            if (is_page) {
                base = "/" + base;
            }
            if (!/^\.*\//.test(base)) {
                base = prefix + base;
            }
            if (prefix) {
                base = base.replace(/\$/g, "/");
                r1 = r1.replace(/\$/g, '/');
            } else {
                base = base.replace(/\//g, "$");
                r1 = r1.replace(/\//g, '$');
            }
            var r2 = base + r1;
        } else {
            var r2 = r1.replace(/\//g, '$');
        }
        return r2;
    });
};
var createModule = function (exec, argNames, prebuilds = {}) {
    var module = {};
    var exports = module.exports = {};
    var isModuleInit = false;
    if (!argNames) argNames = [];
    var argslength = argNames.length >> 1;
    var required = exec.required;
    if (required) required = required.map(a => loadedModules[keyprefix + a]);

    var argsList = argNames.slice(0, argslength).map(function (argName) {
        if (argName in prebuilds) {
            return prebuilds[argName];
        }
        if (argName === "module") {
            isModuleInit = true;
            return module;
        }
        if (argName === "exports") {
            isModuleInit = true;
            return exports;
        }
        if (/^(?:window|global|undefined)$/.test(argName)) return window[argName];
        if (argName === "require") return function (refer) {
            if (refer.length) return window.require(refer);
            var mod = required[refer];
            return createModule(mod, mod.args, prebuilds);
        };
        var filename = location.pathname + exec.file.replace(/([\s\S])[\$]/g, '$1/').replace(/\\/g, '/');
        if (argName === "__dirname") {
            return filename.replace(/[^\/]+$/, '');
        }
        if (argName === "__filename") {
            return filename;
        }
        if (argName === "define") return window[argName] || function (m_name, requires, exec) {
            if (m_name instanceof Function) {
                exec = m_name;
                return exec.call(_this);
            }
            if (m_name instanceof Array) {
                exec = requires;
                requires = m_name;
            }
            if (!/^\//.test(m_name)) {
                m_name = m_name.replace(/\//g, '$');
            }
            return exec.apply(_this, requires.map(a => init(a)));
        };
        var _ok, result, created;
        var promise = new Promise(function (ok) {
            _ok = ok;
        });
        init(argName, function (res) {
            result = res;
            created = true;
            _ok(res);
        }, prebuilds);
        if (created) return result;
        return promise;
    });

    var _this = isModuleInit ? exports : window;
    var argsPromises = argsList.filter(a => a instanceof Promise);
    if (!argsPromises.length) {
        var compiledNames = argNames.slice(argslength, argslength << 1);
        argsList.push(compiledNames);
        return exec.apply(_this, argsList);
    }
    return Promise.all(argsList).then(function (args) {
        return exec.apply(_this, args);
    });
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


var init = function (name, then, prebuilds) {
    then = bindthen(then);
    var key = keyprefix + name;
    var hasOwnProperty = {}.hasOwnProperty;
    if (prebuilds) {
        if (name in prebuilds) {
            return then(prebuilds[name]);
        }
    }
    if (hasOwnProperty.call(modules, name)) {
        then(modules[name]);
        return;
    }
    if (window[name] !== null && window[name] !== void 0 && !hasOwnProperty.call(forceRequest, name)) {
        then(modules[name] = window[name]);
        return;
    }
    loadModule(name, function () {
        if (hasOwnProperty.call(modules, name)) {
            then(modules[name]);
            return;
        }
        var module = loadedModules[key];
        var args = module.args || [];
        if (!args || !args.length) {
            var created = module.call(window);
            then(modules[name] = created);
            return;
        }
        var filteredArgs = prebuilds ? args.filter(a => !(a in prebuilds)) : args;

        var saveAsModule = filteredArgs.length === args.length;
        if (!filteredArgs.length) {
            var created = module.apply(window, args.map(a => prebuilds[a]));
            then(created);
            return;
        }
        if (saveAsModule) {
            if (penddings[key]) {
                penddings[key].then(then);
                return;
            }
        }

        var created = createModule(module, args, prebuilds);
        if (created instanceof Promise) {
            if (saveAsModule) {
                penddings[key] = created;
                created.then(function (res) {
                    then(modules[name] = res);
                });
                return;
            }
        } else {
            if (saveAsModule) modules[name] = created;
        }
        
        then(created);
    }, prebuilds);
};
var forceRequest = {};
var removeGlobalProperty = function (property) {
    forceRequest[property] = true;
};

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
var requires_count = 3;
var hook = function (requires_count) {
    if (requires_count !== 0) return;
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
};
var flush_to_storage_timer = 0,
    responseTree_storageKey = "zimoliAutoSavedResponseTree" + location.pathname;
var saveResponseTreeToStorage = function () {
    var responseTextArray = [];
    for (var k in versionTree) {
        var key = keyprefix + k;
        if (responseTree[key]) responseTextArray.push(
            k + "：" + versionTree[k] + "：" + responseTree[key]
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
        var key = keyprefix + responseName;
        if (responseTree[responseName]) return;
        var version = preLoadVersionTree[responseName];
        if (!version) return;
        var responseText = preLoadResponseTree[responseName];
        var sum = crc(responseText).toString(36);
        if (sum + version.slice(sum.length) === versionTree[responseName])
            responseTree[key] = responseText;
        // else window.console.log(responseName, sum, version, versionTree[responseName]);
    };
};
var preLoad = function () { };

var start_time = +new Date / 1000 | 0;

var modules = {
    isProduction,
    start_time,
    MOVELOCK_DELTA: 3 * renderPixelRatio,
    SAFE_CIRCLE_DEPTH: 300,
    init,
    versionTree,
    responseTree,
    loadingTree,
    load: loadModule,
    devicePixelRatio,
    renderPixelRatio,
    debug() {
        document.addEventListener("blur", e => e.stopPropagation(), true);
    },
    put(name, module) {
        modules[name] = module;
    },
};
var penddings = {};

modules.modules = modules;
var requires_count = 3;
var hook = function (requires_count) {
    if (requires_count !== 0) return;
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

initIfNotDefined(Promise, "Promise", promise => Promise = promise);
initIfNotDefined([].map, "[]map", map => map);
"alert confirm innerWidth innerHeight".split(/\s+/).map(removeGlobalProperty);
loadResponseTreeFromStorage();
if (!isProduction) window.modules = modules;
var onload = function () {
    window.onload = null;
    hook(--requires_count);
};
if (document.body) onload();
else window.onload = onload;