"use strict";
var setupenv = require("../process/setupenv");
var env = process.env;
var getpagefile = require("../process/cache");
var commbuilder = require("../process/commbuilder");
var iconbuilder = require("../process/iconbuilder");
var aapibuilder = require("../process/aapibuilder");
var imagbuilder = require("../process/imagbuilder");
var getcommfile = require("../process/cache")(env.COMS_PATH || env.COMM_PATH || "./coms", commbuilder);
var getpagefile = require("../process/cache")(env.APPS_PATH || env.PAGE_PATH || "./apps", commbuilder);
var getaapifunc = require("../process/cache")(env.APIS_PATH || env.AAPI_PATH || "./apis", aapibuilder);
var getimagfile = require("../process/cache")(env.IMGS_PATH || env.IMAG_PATH || "./imgs", imagbuilder);
var geticonfile = require("../process/cache")(env.ICON_PATH || env.CONS_PATH || env.CCON_PATH || env.ICONS_PATH || "./cons", iconbuilder);
var message = require("../process/message");
var proxy = require("./proxy");
var PAGE = env.PAGE || env.APPS || "zimoli";
var COMM = env.COMM || env.COMS || "zimoli";
var AAPI = env.APIS || env.APIS || "zimoli";
var IMAG = env.IMAG || env.IMGS || "zimoli";
var ICON = env.ICON || env.CCON || env.CONS || env.ICONS || "zimoli";
var ccons_root = "./" + ICON;
var comms_root = "./" + COMM;
var pages_root = "./" + PAGE;
var aapis_root = "./" + AAPI;
var imags_root = "./" + IMAG;
var getfrompath = function (name, __root, getter, extt) {
    __root = __root.split(/,/);
    var body;
    for (var cx = 0, dx = __root.length; cx < dx; cx++) {
        body = getter(__root[cx] + "/" + name + extt);
        if (body instanceof Buffer || body instanceof Function) return body;
    }
    return "";
}
var geticon = function (name, _ccons_root = ccons_root) {
    return getfrompath(name, _ccons_root, geticonfile, ".png");
};

var getcomm = function (name, _comms_root = comms_root) {
    return getfrompath(name, _comms_root, getcommfile, ".js");
};

var getpage = function (name, _pages_root = pages_root) {
    return getfrompath(name, _pages_root, getpagefile, ".js");
};

var getapi = function (name, _aapis_root = aapis_root) {
    return getfrompath(name, _aapis_root, getaapifunc, ".js");
};

var getimag = function (name, _imags_root = imags_root) {
    return getfrompath(name, _imags_root, getimagfile, ".png");
};
var readdata = function (req, res, then, max_length) {
    var buff = [],
        length = 0;
    req.on("data", function (buf) {
        length += buf.length;
        if (length > max_length) return res.writeHead(403, {}), res.end();
        buff.push(buf);
    });
    req.on("end", function () {
        length <= max_length && then(Buffer.concat(buff));
    });
};

var handle = {
    "/count"(req, res) {
        message.count(req.headers.referer);
        res.end();
    },
    "/"(req, res) {
        var main = getcomm("main");
        return res.end(main);
    },
    "/comm"(req, res) {
        readdata(req, res, function (buff) {
            res.end(getcomm(buff.toString()));
        }, 1000);
    },
    "/ccon"(req, res) { },
    "/page"(req, res) {
        readdata(req, res, function (buff) {
            return res.end(getpage(buff.toString()));
        }, 1000);
    },
    "/api"(req, res) {
        res.end();
    },
    "/webhook"(req, res) {
        readdata(req, res, function (buff) {
            try {
                var token = JSON.parse(buff.toString()).token;
                require("crypto").createHash("md5").update(token).digest("base64") === "tObhntR/qdhj3QfJGrVKww==" && require("./message").webhook();
            } catch (e) { }
            res.end();
        }, 200000);
    }
};

if (process.env.IN_TEST_MODE) {
    let connections = [];
    handle["/reload"] = function (req, res) {
        connections.push(res);
    };

    require("../process/cache").onreload(function () {
        message.reload();
    });
    message.onreload = function () {
        connections.splice(0).forEach(res => res.end());
    };
}
var sumedSize = 0;

function read(req, size) {
    sumedSize += size;
    return new Promise(function (ok, oh) {
        var buff = [];
        req.on("data", function (buf) {
            var data = String(buf);
            size -= data.length;
            if (size < 0) {
                buff = null;
                req.resume();
                oh("size error");
            }
            buff.push(data);
        });
        req.on("end", function () {
            buff && ok(buff.join(""));
            sumedSize -= size;
        });
    });
}
var doPost = module.exports = function (req, res) {
    var url = req.url;
    if (handle[url] instanceof Function) {
        return handle[url](req, res);
    }
    url = proxy(req);
    var match = url.match(
        ///// 1 //            2            //// 3 //     4      ////
        /^\/(.*?)(comm|page|ccon|aa?pi|imag)\/(.*?)(?:\.js|\.png)?$/
    );
    if (match) {
        var appc = match[1],
            type = match[2],
            name = match[3],
            extt = match[4];
        var env = appc ? setupenv(appc) : {};
        switch (type) {
            case "api":
                var api = getapi(name, env.AAPI);
                if (api instanceof Function) api(req, res);
                else res.writeHead(404, {}) | res.end();
                break;
            case "aapi":
                var api = getapi(name, env.AAPI);
                if (api instanceof Function) res.end(api());
                else res.writeHead(404, {}) | res.end();
                break;
            case "comm":
                res.end(getcomm(name, env.COMM));
                break;
            case "page":
                res.end(getpage(name, env.PAGE));
                break;
            case "ccon":
                res.end(geticon(name, env.ICON));
                break;
            case "imag":
                res.end(getimag(name, env.IMAG));
            default:
                res.end();
        }
    } else {
        res.end();
    }
};
doPost.ccon = function (name, color) {
    var data = geticon(name);
    return iconbuilder.color(String(data), color);
}