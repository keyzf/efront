var extend = require("../zimoli/extend");
var clients = [], indexedKeepingClients = [];
var increaseId = 0x1fffffff + (0x1fffffff * Math.random() | 0);

var byOptime = (a, b) => a.optime <= b.optime;

var Client = function (id = ++increaseId) {
    if (id instanceof Object) {
        extend(this, id);
    } else {
        this.id = id;
    }
};

Client.prototype = {
    name: '',
    id: '',
    optime: 0,
    res: null,
    messages: [],
    printer: null,
    removeIndex() {
        var index = getIndexFromOrderedArray(indexedKeepingClients, this, byOptime);
        if (indexedKeepingClients[index] === this) {
            indexedKeepingClients.splice(index, 1);
        }
    },
    refresh() {
        this.removeIndex();
        this.optime = +new Date;
    },
    keep(time = 24 * 3600 * 1000 * 7) {
        this.removeIndex();
        this.optime += time;
        saveToOrderedArray(indexedKeepingClients, this, byOptime);
    },
    clean() {
        this.messages.splice(0, this.messages.length);
        this.refresh();
    },
    deliver(msgid) {
        var { res } = this;
        if (msgid instanceof Array) {
            this.messages.push.apply(this.messages, msgid)
        } else if (msgid) {
            this.messages.push(msgid);
        }
        if (res) {
            this.res = null;
            var msg = JSON.stringify(this.messages);
            res.forEach(a => a.end(msg));
            this.clean();
        }
    },
    listen(res) {
        if (!this.res) {
            this.res = [];
        };
        res.on('close', setClosed);

        this.res.push(res);
    },
    valueOf() {
        return this.id;
    }
};
var removedindex = 0;
var setClosed = function () {
    this.isclosed = true;
};
var autoremove = function () {
    var time = +new Date, delta = 30 * 1000;
    for (var cx = removedindex - 1, dx = removedindex - 1000; cx >= dx; cx--) {
        if (cx < 0) {
            break;
        }
        var client = clients[cx];
        if (client.optime + delta < time) {
            var res = client.res;
            if (res instanceof Array) {
                client.deliver();
                continue;
            }
            clients.splice(cx, 1)[0].removeIndex();
        } else {
            var messages = client.messages;
            if (messages.length > 200) {
                messages.splice(messages.length - 200, messages.length);
            }
        }
    }
    removedindex = dx;
    if (removedindex <= 0) {
        removedindex = clients.length;
    }
    if (indexedKeepingClients.length >= 3000) {
        for (var cx = indexedKeepingClients.length; cx >= 2000; cx--) {
            var client = indexedKeepingClients[cx];
            var clientindex = getIndexFromOrderedArray(clients, client);
            if (clients[clientindex] === client) {
                clients.splice(clientindex, 1);
            }
        }
        indexedKeepingClients.splice(2000, indexedKeepingClients.length);
        if (removedindex >= clients.length) removedindex = clients.length - 1;
    }
};

var interval = setInterval(autoremove, 20);

var methods = {
    destroy() {
        clearInterval(interval);
        clients.splice(0, clients.length).forEach(u => u.deliver());
    },
    get(clientid) {
        var index = getIndexFromOrderedArray(clients, clientid);
        if (clients[index] && clients[index].id === clientid) {
            return clients[index];
        }
        return null;
    },
    has(clientid) {
        var index = getIndexFromOrderedArray(clients, clientid);
        return clients[index.id].id === clientid;
    },
    create(config) {
        var client = new Client(config);
        return client;
    },
    attach(clientid) {
        var client = this.get(clientid);
        if (client) return client;
        client = this.create(clientid);
        saveToOrderedArray(clients, client);
        return client;
    },
    deliver(clientid, message) {
        var client = this.get(clientid);
        if (client) {
            if (client.res) {
                client.deliver(message);
                return true;
            }
        }
        return false;
    },
    detach(clientid) {
        var index = getIndexFromOrderedArray(clients, clientid);
        if (clients[index].id === clientid) {
            clients.splice(index, 1)[0].removeIndex();
        }
    }
};
Object.assign(clients, methods);
module.exports = clients;