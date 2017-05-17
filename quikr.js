(function (root) {

    var tmpl_cache = {};
    var resp_cache = {};
    var quikr = {
        cache_time: 5000,
        tmpl: function tmpl(str, data, option_id) {
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

                if(option_id){
                    tmpl_cache[option_id] = fn;
                }
            // Provide some basic currying to the user
            return data ? fn(data) : fn;
        },
        get: function (url, data) {
            if(typeof this._urls_[url] == "function"){
                var resp = this._urls_[url](data);
                if(typeof resp.done == "function"){
                    return resp;
                } else {
                    return $.Deferred(function($d){
                        $d.resolve(resp);
                    }).promise();
                }
            } else {
                var cache_url = url + ((url.indexOf("?") > -1) ? "&" : "?") + $.param(data);
                if (resp_cache[cache_url] && resp_cache[cache_url].timestamp > new Date().getTime()) {
                    return resp_cache[cache_url].$req
                }
                resp_cache[cache_url] = {
                    timestamp: new Date().getTime() + this.cache_time,
                    $req: $.get(url, data)
                };
                return resp_cache[cache_url].$req;
            }
        },
        _actions_: {},
        action: function (action, callback) {
            this._actions_[action] = callback;
            return this;
        },
        _urls_: {},
        url: function (url, callback) {
            this._urls_[url] = callback;
            return this;
        },
        applyTmpl : function(elem, rawdata){
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
            var render = function(resp){
                if(!elem.getAttribute("qkr")){
                    elem.innerHTML = quikr.tmpl(elem.id, resp);
                } else {
                    var children = elem.children;
                    var innerHTML = "";
                    if(children.length ==1 && children[0].nodeName  == "SCRIPT"){
                        innerHTML = children[0].innerHTML;
                    } else {
                        innerHTML = elem.innerHTML;
                    }
                    elem.innerHTML = quikr.tmpl($("<textarea/>").html(innerHTML).val(), resp,elem.id);
                }
                elem.setAttribute('qkr', "");
            };

            if(apis.length>0){
                $.when.apply($, apis.map(function (api) {
                    return quikr.get(api.url, elem.dataset).then(function (resp) {
                        data[api.key] = resp;
                        return data;
                    });
                })).done(function (resp) {
                    render(resp);
                });
            } else if(rawdata){
                render(rawdata);
            }

        }
    };

    $(document).ready(function () {
        $('[qkr="tmpl"]').each(function (i, elem) {
            quikr.applyTmpl(elem);
        });
        $("body").on("click", '[qkr="action"]', function (e) {
            var elem = e.target;
            var getUrl = elem.getAttribute("get-url");
            var postUrl = elem.getAttribute("post-url");
            var action = elem.getAttribute("qkr-action");
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
    quikr.action("qkr-reload",function(data){
        var tmpl = this.getAttribute("qkr-tmpl");
        quikr.applyTmpl(document.getElementById(tmpl));
    });
    root.quikr = quikr;
})(this);
