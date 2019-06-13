"use strict";
var fs = require("fs");
var path = require("path");
var gbk2utf8 = require("./gbk2utf8");
var reg_set = /^\s*@?\s*(?:set|setx)\s+(.*?)\s*=\s*(['"`]?)([\s\S]*)\2$/im;
var reg_call = /^\s*@?\s*call\s+(["]?)(.+?)\1([\s\S]*)$/i;
var reg_for = /^\s*@?\s*for\s+([%\w]+)\s+in\s*\((.*?)\)\s*do\s+(.*?)$/i;

var reg_if =
    //00 matched_text
    //01 ignorecase
    //02 not
    //03 label
    //04 level
    //05 condition_left
    //06 condition_symbol
    //07 condition_right
    //08 qoute
    //09 exist
    //10 defined
    //11 command
    ////////////////   1  ///   2  //////           3            ///// 4 /// 5 /////                 6                  ///// 7 /////////// 8 // 9 ///////////////10 //////   11   ///
    /^\s*@?\s*if\s+(\/i\s+)?(not\s+)?(?:(cmdextversion|errorlevel)\s+(.+?)|(.+?)\s*(\=\=|\b(?:equ|neq|lss|leq|gtr|geq)\b)\s*(.+?)|exist\s+(["])(.+?)\8|defined\s+(.+?))\s+([\s\S]*?)$/i;
var if_conditions = {
    "==": (a, b) => a == b,
    "equ": (a, b) => a == b,
    "neq": (a, b) => a != b,
    "lss": (a, b) => a < b,
    "leq": (a, b) => a <= b,
    "gtr": (a, b) => a > b,
    "geq": (a, b) => a >= b
};
var env = process.env;
if (!env.cd && !env.CD) {
    env.cd = process.cwd();
}
for (var k in env) {
    var upperKey = k.toUpperCase();
    var lowerKey = k.toLowerCase();
    env[upperKey] = env[k];
    env[lowerKey] = env[k];
}
var call = function (file, args = []) {
    file = path.normalize(file.replace(/[\\]+/ig, "/"));
    if (!fs.existsSync(file)) {
        var _file;
        var _path = path.parse(file);
        var _dir = _path.dir;
        var _name = _path.name;
        if (!fs.existsSync(_dir) || !fs.statSync(_dir).isDirectory()) {
            return;
        }
        fs.readdirSync(_dir).forEach(function (name) {
            if (!_file) {
                if (name.startsWith(_name) && /\.(bat|cmd)$/i.test(name)) {
                    _file = path.join(_dir, name);
                }
            }
        });
        if (!_file) {
            return;
        }
        file = _file;
    }
    var data = fs.readFileSync(file);
    (
        /^\s*@\s*chcp\s*65001\b/i.test(data.slice(0, 100).toString())
            ? String(data)
            : gbk2utf8(data)
    )
        .replace(/%(\d)/g, function (match, i) {
            return args[i];
        })
        .replace(/%~dp\d/ig, path.join(path.resolve(path.parse(file).dir), "./"))
        .replace(/\\/g, '/')
        .trim()
        .split(/[\r\n]+\s*/g)
        .forEach(get);
};
var get = function (text) {
    match = text.match(reg_for)
    if (match) {
        var variable = match[1];
        var set = get(match[2]).split(/[,]/);
        var function_body = match[3];
        for (var cx = 0, dx = set.length; cx < dx; cx++) {
            var executer = function_body.replace(new RegExp(variable, "ig"), set[cx]);
            get(executer);
        }
    }
    text = text
        .replace(/%(.*?)%/ig, function (match, env_name) {
            if (!env_name) return "%";
            return env[env_name.toUpperCase()];
        }).replace(/\\/g, "/");
    var match = text.match(reg_if);
    if (match) {
        var [matched_text, ignorecase, not, label, level, condition_left, condition_symbol, condition_right, qoute, exist, defined, command] = match;
        if (!!not ^ (
            level && env[label] == level ||
            condition_left && if_conditions[condition_symbol.toLowerCase()](
                ignorecase ? condition_left.toUpperCase() : condition_left,
                ignorecase ? condition_right.toUpperCase() : condition_right
            ) ||
            exist && fs.existsSync(path.normalize(exist.replace(/[\\]+/gi, "/"))) ||
            defined && defined in env
        )) get(command);
    }
    var match = text.match(reg_set);
    if (match) {
        var k = match[1].toUpperCase(),
            v = env[k] || match[3];
        if (v)
            return env[k] = /^path\.|path$/i.test(k) ? path.normalize(v.replace(/[\\]+/g, "/")) : v || "";
        else
            return delete env[k]
    }
    var match = text.match(reg_call);
    if (match) {
        call(match[2], match[3].split(/\s+/));
    }
    return text;
};
call("./_envs/setup.bat");
call(path.join(__dirname, "../_envs/setup.bat"));

if (!env.PAGE) env.PAGE = env.APP || "";
var cache = {};
module.exports = function (appname) {
    appname = appname.replace(/^[\/\\]*(.*?)[\/\\]*$/g, "$1");
    if (cache[appname]) return cache[appname];
    else env = {};
    call("./_envs/app=" + appname + ".bat");
    cache[appname] = env;
    "IMAG COMM AAPI".split(/\s+/).forEach(function (key) {
        if (!env[key]) {
            var default_value = process.env[key] || "zimoli";
            if (appname === default_value) {
                env[key] = default_value;
            } else if (default_value) {
                env[key] = appname + "," + default_value;
            }
        }
    });
    extend(env, env, appname);
    extend(env, process.env);
    if (!env.PAGE) env.PAGE = appname;
    pollyfill(env, appname);
    return env;
};
var pollyfill = function (env, appname) {
    if (!env.PAGE) env.PAGE = appname;
    for (var k in bootConfig) {
        env[k] = env[k] ? (
            env[k].split(",").map(a => a === ":" ? path.join(__dirname, "..", bootConfig[k]) : a).join(",")
        ) : bootConfig[k];
    }
    if (!env.PAGE_PATH) {
        env.PAGE_PATH = "./apps";
    }
    if (!env.PUBLIC_PATH) {
        env.PUBLIC_PATH = "./public";
    }
};
var normalize = function (o) {
    for (var k in o) {
        var v = o[k];
        if (/[\/\\]/.test(v)) {
            o[k] = path.normalize(v);
        }

    }
};
var bootConfig = {
    COMS_PATH: "./coms",
    APIS_PATH: "./apis",
    ICON_PATH: "",
};

var extend = function (dst, env) {
    var obj = {
        COMS_PATH: dst.COMS_PATH || env.COMS_PATH || env.COMM_PATH || "",
        PAGE_PATH: dst.PAGE_PATH || env.APPS_PATH || env.PAGE_PATH || env.PAGES_PATH || "",
        APIS_PATH: dst.APIS_PATH || env.APIS_PATH || env.AAPI_PATH || "",
        ICON_PATH: dst.ICON_PATH || env.ICON_PATH || env.CONS_PATH || env.CCON_PATH || env.ICONS_PATH || "",
        PAGE: dst.PAGE || env.PAGE || env.APPS || "",
        COMM: dst.COMM || env.COMS || env.COMM || "",
        AAPI: dst.AAPI || env.APIS || env.AAPI || "",
        IMAG: dst.IMAG || env.IMAG || env.IMGS || "",
        ICON: dst.ICON || env.ICON || env.CCON || env.CONS || env.ICONS || "",
        PUBLIC_PATH: dst.PUBLIC_PATH || env.PUBLIC_PATH || "",
    };
    Object.assign(dst, obj);
    normalize(dst);
};
extend(process.env, process.env);
pollyfill(process.env, "zimoli");
process.env.IN_DEBUG_MODE = (process.execArgv || process.argv).findIndex(e => /--(?:debug|inspect)-brk=/i.test(e)) >= 0 ? 1 : 0