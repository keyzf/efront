
function cless(commFactory, styleSheet, className) {
    var style = createElement("style");
    style.type = "text/css";
    if (style.styleSheet) {
        style.styleSheet.cssText = styleSheet;
    } else {
        style.innerHTML = styleSheet
    }
    appendChild(document.getElementsByTagName("head")[0], style);
    if (isFunction(commFactory)) return function () {
        var commRelease = commFactory.apply(this || null, arguments);
        if (commRelease) {
            try {
                addClass(commRelease, className);
            } catch (e) {
                console.error(e, "bindClassNameError");
            }
        }
        return commRelease;
    };
    if (commFactory) {
        try {
            addClass(commFactory, className);
        } catch (e) {
            console.error(e, "bindClassNameError");
        }
    }
    return commFactory;
}