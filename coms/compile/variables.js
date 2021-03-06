"use strict";
/**
 * 读取全局变量
 */
var keywords = require("./keywords");
var ieSpecialWords = Object.assign({
    valueOf: true
}, keywords);
var merge = function (dst, o) {
    for (var k in o) {
        if (o[k] instanceof Array) {
            if (!(dst[k] instanceof Array)) {
                dst[k] = [];
            }
            dst[k] = dst[k].concat(o[k]);
            continue;
        }
        dst[k] = o[k] === true ? true : dst[k] || o[k];
    }
};
var regrep = function (v) {
    return v.replace(/\\[\s\S]|\//g, r => r === "/" ? '\\/' : r);
};

var setUndeclaredType = function (unDeclaredVariables, type) {
    for (var k in unDeclaredVariables) {
        unDeclaredVariables[k] = unDeclaredVariables[k] instanceof Array ? unDeclaredVariables[k] : type;
    }
};

var getVariables = function (ast) {

    var DeclaredVariables = Object.create(null),
        unDeclaredVariables = Object.create(null);
    var required = [];
    if (ast instanceof Object) {
        switch (ast.type) {
            case "VariableDeclaration":
                var {
                    DeclaredVariables,
                    unDeclaredVariables
                } = getVariables(ast.declarations);
                for (var k in DeclaredVariables) {
                    if (DeclaredVariables[k] === true) {
                        DeclaredVariables[k] = ast.kind;
                    }
                }
                for (var k in unDeclaredVariables) {
                    if (unDeclaredVariables[k] === true) {
                        DeclaredVariables[k] = ast.kind;
                    }
                }
                break;
            case "AssignmentPattern":
                var {
                    DeclaredVariables,
                    unDeclaredVariables
                } = getVariables(ast.left);
                var {
                    DeclaredVariables: d,
                    unDeclaredVariables: u,
                } = getVariables(ast.right);
                setUndeclaredType(u, 'assign');
                setUndeclaredType(d, 'assign');
                merge(unDeclaredVariables, u);
                merge(DeclaredVariables, d);
                break;
            case "VariableDeclarator":
                var {
                    DeclaredVariables,
                    unDeclaredVariables
                } = getVariables(ast.id);
                var {
                    DeclaredVariables: d,
                    unDeclaredVariables: u
                } = getVariables(ast.init);
                setUndeclaredType(u, 'initer');
                setUndeclaredType(d, 'initer');
                merge(unDeclaredVariables, u);
                merge(DeclaredVariables, d);

                break;
            case "BlockStatement":
                var {
                    DeclaredVariables,
                    unDeclaredVariables
                } = getVariables(ast.body);
                setUndeclaredType(unDeclaredVariables, 'block');
                for (var k in DeclaredVariables) {
                    if (DeclaredVariables[k] !== "var") {
                        delete DeclaredVariables[k];
                    }
                }
                break;
            case "MemberExpression":
                var {
                    DeclaredVariables,
                    unDeclaredVariables
                } = getVariables(ast.object);
                if (ast.property.type === "Identifier") {
                    //用以兼容IE5-9
                    if (!ast.computed) {
                        var name = ast.property.name;
                        if (name in ieSpecialWords || getVariables.computed) {
                            ast.property = {
                                "type": "Literal",
                                "value": name,
                                "raw": JSON.stringify(name)
                            };
                            ast.computed = true;
                        }
                    }
                } else {
                    var {
                        DeclaredVariables: d,
                        unDeclaredVariables: u
                    } = getVariables(ast.property);
                    merge(unDeclaredVariables, u);
                    merge(DeclaredVariables, d);
                }
                break;
            case "Property":
                var {
                    DeclaredVariables,
                    unDeclaredVariables
                } = getVariables(ast.value);
                if (ast.key.type === "Identifier") {
                    if (!ast.key.computed) {
                        //用以兼容IE5-9
                        var name = ast.key.name;
                        if (name in ieSpecialWords || getVariables.computed) {
                            ast.key = {
                                "type": "Literal",
                                "value": name,
                                "raw": JSON.stringify(name)
                            };
                            if (getVariables.computed) ast.computed = true;
                        }
                    }
                }
                ast.shorthand = false; //让esmangle兼容shorthand
                break;
            case "CatchClause":
                var {
                    DeclaredVariables,
                    unDeclaredVariables
                } = getVariables(ast.body);
                var {
                    DeclaredVariables: d,
                    unDeclaredVariables: u
                } = getVariables(ast.param);
                for (var k in u) {
                    delete unDeclaredVariables[k];
                }
                break;
            case "FunctionDeclaration":
            case "FunctionExpression":
            case "ArrowFunctionExpression":
                var {
                    DeclaredVariables,
                    unDeclaredVariables
                } = getVariables(ast.body);
                var {
                    DeclaredVariables: d,
                    unDeclaredVariables: u
                } = getVariables(ast.params);
                for (var k in u) {
                    delete unDeclaredVariables[k];
                }
                setUndeclaredType(unDeclaredVariables, 'function');
                ast.id ? DeclaredVariables = {
                    [ast.id.name]: "function"
                } :
                    DeclaredVariables = {};
                break;
            case "Identifier":
                if (!unDeclaredVariables[ast.name]) unDeclaredVariables[ast.name] = true;
                break;
            case "":
            case "LabeledStatement":
                var {
                    DeclaredVariables,
                    unDeclaredVariables
                } = getVariables(ast.body);
            case "BreakStatement":
            case "ContinueStatement":
                break;
            case "CallExpression":
                if (ast.callee.name === "require") {
                    var argument = ast.arguments[0];
                    if (argument.type === 'Literal') {
                        required.push(argument);
                        merge(unDeclaredVariables, { require: required });
                        break;
                    }
                }
                for (var k in ast) {
                    var {
                        DeclaredVariables: d,
                        unDeclaredVariables: u
                    } = getVariables(ast[k]);
                    merge(DeclaredVariables, d);
                    merge(unDeclaredVariables, u);
                }

                break;

            case "ExpressionStatement":
                //去除测试脚本
                var expression = ast.expression;
                if (expression.type === "CallExpression" && expression.callee.type === "Identifier") {
                    if (expression.callee.name.toLowerCase() === "describe") {
                        for (var k in ast) {
                            delete ast[k];
                        }
                        ast.type = "EmptyStatement";
                        break;
                    }
                }
            case "UnaryExpression":
                if (ast.operator === "typeof" && ast.argument.type === 'Identifier') {
                    break;
                }
            case "Literal":
                if (ast.regex) {
                    ast.regex.pattern = regrep(ast.regex.pattern);
                    ast.value = new RegExp(ast.regex.pattern, ast.regex.flags);
                    ast.raw = String(ast.value);
                    break;
                }
            // break;
            default:
                for (var k in ast) {
                    var {
                        DeclaredVariables: d,
                        unDeclaredVariables: u
                    } = getVariables(ast[k]);
                    merge(DeclaredVariables, d);
                    merge(unDeclaredVariables, u);
                }
                break;
        }
        for (var k in DeclaredVariables) {
            allVariables[k] = true;
            delete unDeclaredVariables[k];
        }
    }
    for (var k in unDeclaredVariables) {
        if (k in keywords) {
            delete unDeclaredVariables[k];
        } else {
            allVariables[k] = true;
        }
    }
    return {
        DeclaredVariables,
        unDeclaredVariables
    };
};
var allVariables = Object.create(null);

module.exports = function Variables(ast) {
    var res = getVariables(ast);
    res.allVariables = allVariables;
    allVariables = Object.create(null);
    return res;
};