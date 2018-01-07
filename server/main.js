"use strict";
/* 
 * 不枝雀
 * 2017-4-5 22:38:04
 */
var cluster = require("cluster");
var message = require("../process/message");
process.title = `服务器地址：${require("../process/getLocalIP")()}`;
if (cluster.isMaster && process.env.IN_DEBUG_MODE != "1") {
    var watch = require("../process/watch");
    var counter = 0;
    var killing;
    var quitting = [];
    var workers = [];
    var cpus = require('os').cpus();
    var count = require("../process/count");
    var counts = count() || {};
    global.counts = counts;
    var end = function () {
        quitting = quitting.concat(workers);
        workers = [];
        killing = true;
        exit();
    };
    var exit = function () {
        quitting.splice(0).forEach(function (worker) {
            worker.send("quit");
            var timeout = setTimeout(function () {
                worker.kill();
            }, 12000);
            worker.on("disconnect", function () {
                clearTimeout(timeout);
            });
        });
    };
    var broadcast = function (value) {
        var index = value.indexOf(":");
        var key = value.slice(0, index);
        var data = value.slice(index + 1);
        quitting.concat(workers).forEach(function (worker) {
            worker.send([key, data].join(":"));
        });
    };
    var run = function () {
        quitting = quitting.concat(workers);
        var workking = 0;
        workers = cpus.map(function () {
            counter++;
            var worker = cluster.fork();
            worker.on("listening", function () {
                console.info(`process ${worker.id} start at ${Date()}`);
                workking++;
                if (workking === cpus.length) {
                    exit();
                }
            });
            worker.on("exit", function () {
                if (worker.exitedAfterDisconnect !== true) {
                    for (var cx = workers.length - 1; cx >= 0; cx--) {
                        workers[cx] === worker && workers.splice(cx, 1);
                    }
                }
                counter--;
                console.info(`process ${worker.id} ended at ${Date()}`);
                if (!counter && killing) {
                    count(counts);
                    console.info("按 ctrl + c 退出!");
                    setTimeout(function () {
                        process.exit();
                    });
                }
            });
            worker.on("message", message);
            return worker;
        });
    };
    watch("./", run);
    message.quit = end;
    message.broadcast = broadcast;
    process.on("SIGINT", end);
    process.on("SIGTERM", end);
    run();
} else {

    //子线程们
    process.on("message", function (msg, then) {
        if (!(then instanceof Function)) {
            then = function () { };
        }
        switch (msg) {
            case "quit":
                server.close();
                process.exit();
                break;
            default:
                var index = msg.indexOf(":");
                if (index > 0) {
                    var key = msg.slice(0, index),
                        value = msg.slice(index + 1);

                } else {
                    var key = msg,
                        value = void 0;
                }
                var data = value ? JSON.parse(value) : void 0;
                if (key in message) message[key](data);
        }
    });
    // 仅做开发使用的简易服务器
    var http = require("http");
    var https = require("https");
    // build mime
    var doGet = require("./doGet");
    var doPost = require("./doPost");
    var requestListener = function (req, res) {
        var origin = req.headers.origin;
        origin && res.setHeader("Access-Control-Allow-Origin", origin);
        var match = req.url.match(/ccon\/(.*?)\.([\da-f]+)\.png$/);
        if (match) {
            var name = match[1];
            var color = parseInt(match[2], 16);
            return res.end(doPost.ccon(name, color));
        }
        if (req.method === "GET") {
            if (SSL_ENABLED && req.socket.localPort === 80) {
                // 现代浏览器不会给http网站标记为不安全，并且火狐等浏览器对网站进行云检查以判断是否安全
                // 没有必要自动转向https，所以请让以下代码胎死腹中
                // if (req.headers["upgrade-insecure-requests"] && req.headers.host) {
                //     res.writeHead(302, { "Location": "https://" + req.headers.host + req.url });
                //     return res.end();
                // }
                res.setHeader("Content-Security-Policy", "upgrade-insecure-requests");
            }
            return doGet(req, res);
        } else {
            return doPost(req, res);
        }
    };
    // create server
    var server = http.createServer(requestListener);
    server.on("error", function () {
        // console.info("server is already running!");
    });
    server.on("listening", function () {
        // console.info("server start success!");
    });
    server.setTimeout(0);
    server.listen(80);
    var SSL_PFX_PATH = process.env["PATH.SSL_PFX"], SSL_ENABLED = false;
    if (SSL_PFX_PATH) {
        var fs = require("fs");
        if (fs.existsSync(SSL_PFX_PATH)) {
            https.createServer({
                pfx: fs.readFileSync(SSL_PFX_PATH),
                passphrase: process.env["PASSWORD.SSL_PFX"]
            }, requestListener).on("listening", function () {
                SSL_ENABLED = true;
            }).on("error", function () {
                SSL_ENABLED = false;
            }).listen(443).setTimeout(0);
        }
    }
    cluster.isWorker && message.count("boot");
}