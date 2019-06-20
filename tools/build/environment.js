var setupenv = require("../../process/setupenv");
var path = require("path");
var fs = require("fs");
var {
    APP
} = process.env;
var PUBLIC_APP = /* process.argv[2] || */ APP;
var env = PUBLIC_APP ? setupenv(PUBLIC_APP) : process.env;
var {
    PUBLIC_PATH = process.env.PUBLIC_PATH || "./public"
} = env;
var PAGE = env.PAGE || "zimoli";
var COMM = env.COMM || PUBLIC_APP.replace(/\/$/, "") + ",zimoli";
var ICON = env.ICON;
var AAPI = env.APIS || "zimoli";
var PAGE_PATH = env.PAGE_PATH;
var COMS_PATH = env.COMS_PATH;
var ICON_PATH = env.ICON_PATH;
var comms_root = [].concat.apply([], COMS_PATH.split(",").map(function (COMS_PATH) {
    return COMM.split(/,/).map(a => path.join(COMS_PATH, a));
})).filter(fs.existsSync);
var ccons_root = ICON && ICON_PATH ? [].concat.apply([], ICON_PATH.split(",").map(function (ICON_PATH) {
    return ICON.split(/,/).map(a => path.join(ICON_PATH, a));
})).filter(fs.existsSync) : [];

var pages_root = [].concat.apply([], PAGE_PATH.split(",").map(function (PAGE_PATH) {
    return PAGE.split(/,/).map(a => path.join(PAGE_PATH, a));
})).filter(fs.existsSync);
var aapis_root = "./apis/" + AAPI;
module.exports = {
    comms_root,
    ccons_root,
    pages_root,
    aapis_root,
    PAGE,
    COMM,
    ICON,
    AAPI,
    PUBLIC_PATH,
    PAGE_PATH,
    COMS_PATH,
    APP
}