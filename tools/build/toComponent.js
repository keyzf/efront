var escodegen = require("../../process/escodegen/escodegen");
var esprima = require("../../process/esprima");
var esmangle = require("../../process/esmangle/esmangle");
var scanner = require("../../process/compile/scanner");
function toComponent(responseTree) {
    var array_map = responseTree["[].map"];
    delete responseTree["[].map"];
    var resultMap = {}, result = [];
    for (var k in responseTree) {
        var dependence = responseTree[k].dependence;
        result.push([k].concat(dependence).concat(dependence.args).concat(responseTree[k].toString().slice(dependence.offset)));
    }
    var dest = [], last_result_length = result.length;
    var $$_efront_map_string_key = "$$_efront_map_const_string_key__";

    while (result.length) {
        for (var cx = result.length - 1, dx = 0; cx >= dx; cx--) {
            var [k, ...module_body] = result[cx];
            var ok = true;
            module_body.forEach(function (k) {
                if (!resultMap[k] && responseTree[k]) ok = false;
                if (!responseTree[k] && !resultMap[k]) resultMap[k] = dest.length + 1, dest.push(k);
            });
            if (ok) {
                var this_module_params = {};
                var setMatchedConstString = function (match, type, k) {

                    if (/^(['"])user?\s+strict\1$/i.test(k)) return `"use strict"`;
                    if (k.length < 3) return match;
                    switch (type) {
                        case "'":
                            k = k.replace(/(')(.*?)\1/, function (match, quote, string) {
                                return "\"" + string.replace(/\\([\s\S])/g, (a, b) => b === "'" ? b : a).replace(/"/g, "\\\"") + "\"";
                            });
                            break;
                        case ".":
                            k = "\"" + k + "\"";
                            break;
                    }
                    var key = k.replace(/[^\w]/g, a => "$" + a.charCodeAt(0).toString(36) + "_");
                    var $key = $$_efront_map_string_key + key;
                    if (!resultMap[$key]) {
                        dest.push(k);
                        resultMap[$key] = dest.length;
                    }
                    if (!this_module_params[$key]) {
                        this_module_params[$key] = true;
                        module_body.splice(module_body.length >> 1, 0, $key);
                        module_body.splice(module_body.length - 1, 0, $key);
                    }
                    return type === "." ? `[${$key}]` : " " + $key + " ";
                };
                var setMatchedConstRegExp = function (match, type, k) {
                    var key = k.replace(/[^\w]/g, a => "$" + a.charCodeAt(0).toString(36) + "_")
                    var $key = $$_efront_map_string_key + key;
                    if (!resultMap[$key]) {
                        dest.push(k.toString());
                        resultMap[$key] = dest.length;
                    }
                    if (!this_module_params[$key]) {
                        this_module_params[$key] = true;
                        module_body.splice(module_body.length >> 1, 0, $key);
                        module_body.splice(module_body.length - 1, 0, $key);
                    }
                    return type + " " + $key + " ";
                }
                var module_string = module_body[module_body.length - 1]
                var code_blocks = scanner(module_string);
                module_string = code_blocks.map(function (block) {
                    var block_string = module_string.slice(block.start, block.end);
                    if (block.type === block.single_quote_scanner) {
                        return setMatchedConstString(block_string, "'", block_string);
                    }
                    if (block.type === block.double_quote_scanner) {
                        return setMatchedConstString(block_string, "\"", block_string);
                    }
                    if (block.type === block.regexp_quote_scanner) {
                        return setMatchedConstRegExp(block_string, "", block_string);
                    }
                    return module_string.slice(block.start, block.end);
                }).join("").replace(/(\.)\s*((?:\\u[a-f\d]{4}|\\x[a-f\d]{2}|[\$_a-z\u0100-\u2027\u2030-\uffff])(?:\\u[a-f\d]{4}|\\x[a-f\d]{2}|[\$_\w\u0100-\u2027\u2030-\uffff])*)/ig, setMatchedConstString);

                var module_code = esprima.parse(`function ${k.replace(/^.*?([\$_a-z]\w*)\.[tj]sx?$/ig, "$1")}(${module_body.slice(module_body.length >> 1, module_body.length - 1)}){${module_string}}`);
                module_code = esmangle.optimize(module_code, null);
                module_code = esmangle.mangle(module_code);
                module_string = escodegen.generate(module_code, {
                    format: {
                        renumber: true,
                        hexadecimal: true, //十六进位
                        escapeless: true,
                        compact: true, //去空格
                        semicolons: false, //分号
                        parentheses: false //圆括号
                    }
                }).replace(/^function\s+[\$_A-Za-z][\$_\w]*\(/, "function(");
                dest.push(`[${module_body.slice(0, module_body.length >> 1).map(a => resultMap[a]).concat(module_string)}]`);
                resultMap[k] = dest.length;
                result.splice(cx, 1);
            }
        }
        if (last_result_length === result.length) throw new Error(`处理失败！`);
        last_result_length = result.length;
    }
    var PUBLIC_APP = k;
    var template = `this["${PUBLIC_APP.replace(/([a-zA-Z_\$][\w\_\$]*)\.js$/, "$1")}"]=([].map||function(){${array_map}}.call(window)).call([${dest}],function(a,c){return this[c+1]=a instanceof Array?a[a.length-1].apply(this[0],a.slice(0,a.length-1).map(function(a){return this[a]},this)):a},[window])[${dest.length - 1}]`;
    // var tester_path = responseTree[PUBLIC_APP].realpath.replace(/\.[tj]sx?$/, "_test.js");
    // if (tester_path) {
    //     try {
    //         let vm = require("vm");
    //         let globals = require("../../tester/core/suit");
    //         let context = vm.createContext(globals);
    //         vm.runInContext(template, context);
    //         vm.runInContext(fs.readFileSync(tester_path).toString(), context);
    //     } catch (e) {
    //         console.error(e);
    //     }
    // }
    responseTree[PUBLIC_APP].data = template;
    return {
        [PUBLIC_APP]: responseTree[PUBLIC_APP]
    };
}
module.exports = toComponent;