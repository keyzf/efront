

var hasOwnProperty = {}.hasOwnProperty;
var renderElements = {};
var renderidOffset = 0;
var addRenderElement = function () {
    var element = this;
    if (!isNode(element)) return;
    renderElements[element.renderid] = element;
    rebuild(element);
};
var removeRenderElement = function () {
    var element = this;
    delete renderElements[element.renderid];
};

function refresh() {
    for (var k in renderElements) {
        var element = renderElements[k];
        var props = extend({}, element);
        rebuild(element);
        changes = getChanges(element, props);
        if (changes) {
            event = createEvent('changes');
            event.changes = changes;
            dispatch(event, element);
        }
    }
}
function rebuild(element) {
    element.renders.map(a => a.call(element));
}
var createGetter = function (search) {
    var [withContext, searchContext] = search;
    return new Function(`try{${withContext}with(this.$scope)return ${searchContext}}catch(e){/*console.warn(String(e))*/}`);
};
var directives = {
    click(search) {
        var getter = createGetter(search);
        onclick(this, getter);
    },
    src(search) {
        var getter = createGetter(search).bind(this);
        var oldValue, pending;
        var refresh = function () {
            that.src = oldValue;
            removeClass(that, "pending");
            pending = 0;
        };
        var img = document.createElement("img");
        var that = this;
        this.renders.push(function () {
            var value = getter();
            if (value === oldValue) return;
            oldValue = value;
            value = value || "";
            if (!/img/i.test(this.tagName) || !isString(value)) return this.src = value;
            this.setAttribute("src", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQYV2NgAAIAAAUAAarVyFEAAAAASUVORK5CYII=");
            img.src = value;
            if (img.complete) {
                this.src = value;
            } else if (!pending) {
                addClass(this, "pending");
                pending = setTimeout(refresh);
            }
        });
    },
    bind(search) {
        var getter = createGetter(search).bind(this);
        this.renders.push(function () {
            var value = getter();
            if (text(this) !== value) text(this, value);
        });
    },
    model(search) {
        var getter = createGetter(search).bind(this);
        if (/^input$/i.test(this.tagName) && /^checkbox$/i.test(this.type) || /^checkbox$/i.test(this.tagName)) {
            this.renders.push(function () {
                var value = getter();
                if (value === undefined) value = "";
                if (this.checked != value) this.checked = value;
            });
            var change = new Function(`${search[0]}with(this.$scope)${search[1]}=this.checked`).bind(this);
        } else if (("value" in this || this.getValue instanceof Function) && this.setValue instanceof Function) {
            this.renders.push(function () {
                var value = getter();
                if (value === undefined) value = "";
                if (this.value != value) this.setValue(value);
            });
            var change = new Function(`${search[0]}with(this.$scope)${search[1]}=this.value`).bind(this);
        } else if (/^(select|input|textarea)$/i.test(this.tagName) || "value" in this) {
            this.renders.push(function () {
                var value = getter();
                if (value === undefined) value = "";
                if (this.value != value) this.value = value;
            });
            var change = new Function(`${search[0]}with(this.$scope)${search[1]}=this.value`).bind(this);
        } else {
            this.renders.push(function () {
                var value = getter();
                if (value === undefined) value = "";
                if (html(this) != value) html(this, value);
            });
            var change = new Function("html", `${search[0]}with(this.$scope)${search[1]}=html(this)`).bind(this, html);
        }
        var onchange = lazy(change);
        eventsHandlers.map(on => on(this, onchange));
    },
    hide(search) {
        var getter = createGetter(search).bind(this);
        this.renders.push(function () {
            if (getter()) {
                this.style.display = "none";
            } else {
                this.style.display = "";
            }
        });
    },
    show(search) {
        var getter = createGetter(search).bind(this);
        this.renders.push(function () {
            if (getter()) {
                this.style.display = "";
            } else {
                this.style.display = "none";
            }
        });
    },
    "if"(search) {
        // 懒渲染
        var getter = createGetter(search).bind(this);
        var initial = function () {
            var comment = document.createComment("-if:" + search);
            comment.renders = [function () {
                var result = getter();
                if (result) {
                    if (!this.parentNode) appendChild.before(comment, this);
                } else {
                    remove(this);
                }
            }.bind(this)];
            comment.renderid = ++renderidOffset;
            onappend(comment, addRenderElement);
            onremove(comment, removeRenderElement);
            appendChild.after(this, comment);
            rebuild(comment);
        };
        if (this.parentNode) {
            initial.call(this);
        } else {
            once("append")(this, initial);
        }
    },
    repeat(search) {
        // 懒渲染
        throw new Error("repeat is not supported! use list component instead");
    },
    "class"(search) {
        var getter = createGetter(search).bind(this);
        var generatedClassNames = {};
        var oldValue;
        this.renders.push(function () {
            var className = getter();
            if (deepEqual(oldValue, className)) return;
            oldValue = className;
            var originalClassNames = [];
            this.className.split(/\s+/).map(function (k) {
                if (k && !hasOwnProperty.call(generatedClassNames, k) && !hasOwnProperty.call(originalClassNames, k)) {
                    if (!/^\d+$/.test(k)) originalClassNames.push(originalClassNames[k] = k);
                }
            });
            var deltaClassNames = [];
            if (isString(className)) {
                className.split(/\s+/).map(function (k) {
                    if (!hasOwnProperty.call(originalClassNames, k)) {
                        if (!/^\d+$/.test(k)) deltaClassNames.push(deltaClassNames[k] = k);
                    }
                });
            } else if (className instanceof Object) {
                for (var k in className) {
                    if (!hasOwnProperty.call(originalClassNames, k) && className[k]) {
                        if (!/^\d+$/.test(k)) deltaClassNames.push(deltaClassNames[k] = k);
                    }
                }
            }
            var destClassName = originalClassNames.concat(deltaClassNames).join(" ");
            generatedClassNames = deltaClassNames;
            if (this.className !== destClassName) {
                this.className = destClassName;
            }
        });
    },
    style(search) {
        var getter = createGetter(search).bind(this);
        var oldValue;
        this.renders.push(function () {
            var stylesheet = getter();
            if (deepEqual(oldValue, stylesheet)) return;
            oldValue = stylesheet;
            if (isString(stylesheet)) {
                stylesheet.replace(/[\s\u00a0]+/g, "").split(/;/).map(function (kv) {
                    var [k, v] = kv.split(":");
                    if (this.style[k] !== v) {
                        this.style[k] = v;
                    }
                }, this);
            } else if (stylesheet instanceof Object) {
                for (var k in stylesheet) {
                    if (this.style[k] !== stylesheet[k]) {
                        this.style[k] = stylesheet[k];
                    }
                }
            }
        });
    }
};
function renderElement(element, scope, parentScopes = []) {
    if (parentScopes !== null && !isArray(parentScopes)) {
        throw new Error('父级作用域链应以数组的类型传入');
    }
    var children = element.children;
    if (!children) {
        return [].concat.apply([], element).map(function (element) {
            return renderElement(element, scope, parentScopes);
        });
    }
    element.$scope = scope;
    if (parentScopes) {
        if (element.renderid && !element.$parentScopes || element.$parentScopes && element.$parentScopes.length !== parentScopes.length) {
            return new Error("父作用域链的长度必须相等着");
        }
        element.$parentScopes = parentScopes;
    }
    if (children.length) renderElement(children, scope, parentScopes);
    if (element.renderid) return;
    element.renderid = true;
    var attrs = [].concat.apply([], element.attributes);
    var { tagName, parentNode, nextSibling } = element;
    if (parentNode) {
        if (!scope[tagName]) tagName = tagName.toLowerCase();
        if (!scope[tagName])
            tagName = tagName.replace(/(?:^|\-+)([a-z])/ig, (_, w) => w.toUpperCase());
        if (!scope[tagName]) tagName = tagName.slice(0, 1).toLowerCase() + tagName.slice(1);
        if (isFunction(scope[tagName])) var replacer = scope[tagName](element);
        if (isElement(replacer) && element !== replacer) {
            if (nextSibling) appendChild.before(nextSibling, replacer);
            else appendChild(parentNode, replacer);
            if (element.parentNode === parentNode) remove(element);
            attrs.map(function (attr) {
                var { name, value } = attr;
                switch (name.toLowerCase()) {
                    case "class":
                        addClass(replacer, value);
                        break;
                    case "style":
                        css(replacer, value);
                        break;
                    case "src":
                    case "placeholder":
                        replacer[name] = value;
                        break;
                    default:
                        if (!/[\-]/.test(name)) {
                            replacer.setAttribute(name, value);
                        }
                }
            });
            element = replacer;
            element.$scope = scope;
        }
    }
    element.renders = [];
    var withContext = parentScopes ? parentScopes.map((_, cx) => `with(this.$parentScopes[${cx}])`).join("") : '';
    attrs.map(function (attr) {
        var { name, value } = attr;
        if (/^(?:class|style|src)$/i.test(name)) return;
        var key = name.replace(/^(ng|v|.*?)\-/i, "").toLowerCase();
        if (directives.hasOwnProperty(key) && isFunction(directives[key])) {
            directives[key].call(element, [withContext, value]);
        }
    });
    if (element.renders.length) {
        element.renderid = ++renderidOffset;
        onappend(element, addRenderElement);
        onremove(element, removeRenderElement);
        if (element.isMounted) addRenderElement.call(element);
    }
}
function render(element, scope, parentScopes) {
    return renderElement(element, scope, parentScopes);
}

var digest = lazy(refresh);
render.digest = render.apply = render.refresh = digest;

var eventsHandlers = "change,paste,resize,keydown,keypress,keyup,mousedown,mouseup,touchend,touchcancel,touchstart,dragend,drop,click".split(",").map(k => on(k));
eventsHandlers.map(on => on(window, digest));