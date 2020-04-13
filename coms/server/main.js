"use strict";
/* 
 * 不枝雀
 * 2017-4-5 22:38:04
 */
var cluster = require("cluster");
var isDebug = require("../efront/isDebug");
if (cluster.isMaster && !isDebug) {
    require("./master");
} else {
    require("./worker");
}