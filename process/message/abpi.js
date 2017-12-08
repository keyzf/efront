"use strict";
module.exports = function ({
    fullpath,
    data,
    info
}, then) {
    if ("data" in arguments[0]) {
        try {
            Promise.resolve(this[fullpath](data, info)).then(function (result) {
                then({
                    result,
                    status: 200
                });
            }).catch(function (error) {
                then({
                    result: error,
                    status: 403
                });
            });
        } catch (e) {
            then({
                result: e,
                status: 500
            });
        }
    } else {
        try {
            delete require.cache[fullpath];
            this[fullpath] = require(fullpath);
            then("success");
        } catch (e) {
            then("error");
        }
    }
};