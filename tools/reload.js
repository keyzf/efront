function reload() {
    clearTimeout(reload_timmer);
    reload_timmer = setTimeout(function () {
        require("electron").remote.getCurrentWebContents().reload();
    }, 20);
}
var reload_timmer;
function reloader() {
    var xhr = new XMLHttpRequest;
    xhr.open("post", "http://localhost/reload");
    xhr.timeout = 0;
    xhr.onerror = reload;

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) reload();
    };
    xhr.send("haha");
};
new reloader;