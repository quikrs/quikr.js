(function (root) {

    var tmpl_cache = {};
    var resp_cache = {};
    var quikr = {
        cache_time: 2000,
        tmpl: function tmpl(str, data) {
            // Figure out if we're getting a template, or if we need to
            // load the template - and be sure to cache the result.
            var fn = !/\W/.test(str) ?
                tmpl_cache[str] = tmpl_cache[str] ||
                    this.tmpl(document.getElementById(str).innerHTML) :

                // Generate a reusable function that will serve as a template
                // generator (and which will be cached).
                new Function("obj",
                    "var p=[],print=function(){p.push.apply(p,arguments);};" +

                    // Introduce the data as local variables using with(){}
                    "with(obj){p.push('" +

                    // Convert the template into pure JavaScript
                    str
                        .replace(/[\r\t\n]/g, " ")
                        .split("<%").join("\t")
                        .replace(/((^|%>)[^\t]*)'/g, "$1\r")
                        .replace(/\t=(.*?)%>/g, "',$1,'")
                        .split("\t").join("');")
                        .split("%>").join("p.push('")
                        .split("\r").join("\\'")
                    + "');}return p.join('');");

            // Provide some basic currying to the user
            return data ? fn(data) : fn;
        },
        get: function (url, data) {
            var cache_url = url + ((url.indexOf("?") > -1) ? "&" : "?") + $.param(data);
            if (resp_cache[cache_url] && resp_cache[cache_url].timestamp > new Date().getTime()) {
                return resp_cache[cache_url].$req
            }
            resp_cache[cache_url] = {
                timestamp: new Date().getTime() + this.cache_time,
                $req: $.get(url, data)
            };
            return resp_cache[cache_url].$req;
        },
        _actions_: {},
        action: function (action, callback) {
            this._actions_[action] = callback;
            return this;
        }
    };

    $(document).ready(function () {
        $('[qkr="tmpl"]').each(function (i, elem) {
            elem.style.visibility = "hidden";
            var url = elem.getAttribute("url");
            var apis = [];
            for (var i = 0; i < elem.attributes.length; i++) {
                if (elem.attributes[i].name) {
                    var mc = elem.attributes[i].name.match(/url-(.*)/);
                    if (mc && mc[1]) {
                        apis.push({
                            key: mc[1],
                            url: elem.attributes[i].value
                        })
                    }
                }
            }
            var data = {};
            $.when.apply($, apis.map(function (api) {
                return quikr.get(api.url, elem.dataset).then(function (resp) {
                    data[api.key] = resp;
                    return data;
                });
            })).done(function (resp) {
                elem.style.visibility = "visible";
                elem.innerHTML = quikr.tmpl($("<textarea/>").html(elem.innerHTML).val(), resp);
                elem.setAttribute('qkr', "");
            });
        });
        $("body").on("click", '[qkr="action"]', function (e) {
            var elem = e.target;
            var getUrl = elem.getAttribute("get-url");
            var postUrl = elem.getAttribute("post-url");
            var action = elem.getAttribute("action");
            var callback = function (resp) {
                if(typeof quikr._actions_[action] === "function"){
                    quikr._actions_[action].call(elem, resp);
                }
            };
            var data = {};
            for(var key in elem.dataset){
                if(elem.dataset[key].indexOf("?") == 0){
                    data[key] = root.prompt(elem.dataset[key].substr(1) || key,"");
                } else {
                    data[key]=elem.dataset[key];
                }
            }
            if (getUrl) {
                $.get(getUrl, data).done(callback);
            } else if (postUrl) {
                $.post(getUrl, data).done(callback);
            } else {
                callback(data);
            }

        });
    });
    root.quikr = quikr;
})(this);