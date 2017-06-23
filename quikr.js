!(function (root) {

    var tmpl_cache = {};
    var compiled_temp = {};
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

            if (option_id) {
                tmpl_cache[option_id] = fn;
            }
            // Provide some basic currying to the user
            return data ? fn(data) : fn;
        },
        get: function (url, data) {
            if (typeof this._urls_[url] == "function") {
                var resp = this._urls_[url](data);
                if (typeof resp.done == "function") {
                    return resp;
                } else {
                    return jQuery.Deferred(function ($d) {
                        $d.resolve(resp);
                    }).promise();
                }
            } else {
                var cache_url = url + ((url.indexOf("?") > -1) ? "&" : "?") + jQuery.param(data);
                if (resp_cache[cache_url] && resp_cache[cache_url].timestamp > new Date().getTime()) {
                    return resp_cache[cache_url].$req
                }
                resp_cache[cache_url] = {
                    timestamp: new Date().getTime() + this.cache_time,
                    $req: jQuery.get(url, data)
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
        applyTmpl: function (elem, rawdata) {
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
            var render = function (resp) {
                var qkr_tmpl = elem.getAttribute("qkr-tmpl");

                if(qkr_tmpl){
                    if(compiled_temp[qkr_tmpl]){
                        elem.innerHTML  = compiled_temp[qkr_tmpl](resp);
                    }
                    //return;
                } else if (!elem.getAttribute("qkr") && elem.hasAttribute("qkr-tmpl-compiled")) {
                    elem.innerHTML = quikr.tmpl(elem.id, resp);
                } else {
                    var children = elem.children;
                    var innerHTML = "";
                    if (children.length == 1 && children[0].nodeName == "SCRIPT") {
                        innerHTML = children[0].innerHTML;
                    } else {
                        innerHTML = elem.innerHTML;
                    }
                    var newTag = elem.getAttribute('tag');
                    var innerHTMLOut = quikr.tmpl(jQuery("<textarea/>").html(innerHTML).val(), resp, elem.id);
                    if (elem.nodeName === "SCRIPT" && newTag) {
                        elem.innerHTML = "";
                        var $elem = jQuery(elem.outerHTML.replace(/^<script/, "<" + newTag).replace(/<\/script>$/, "</" + newTag + ">"));
                        jQuery(elem).replaceWith($elem);

                        elem = $elem[0];
                        //console.error(innerHTMLOut)
                    }
                    elem.innerHTML = innerHTMLOut;
                    elem.setAttribute("qkr-tmpl-compiled","")
                }
                elem.setAttribute('qkr', "");
                jQuery(elem).removeAttr("qkr-attr").find("[qkr-attr]").removeAttr("qkr-attr");

            };

            if (apis.length > 0) {
                jQuery.when.apply($, apis.map(function (api) {
                    return quikr.get(api.url, elem.dataset).then(function (resp) {
                        data[api.key] = resp;
                        return data;
                    });
                })).done(function (resp) {
                    render(resp);
                });
            } else if (rawdata) {
                render(rawdata);
            } else {
                render(elem.dataset);
            }
        }
    };



    quikr.init = function () {
        jQuery('script[type="text/qkr-tmpl"]').each(function (i, elem) {
            compiled_temp[elem.id] = quikr.tmpl(elem.innerHTML, undefined ,elem.id);
        });
        jQuery('[qkr="tmpl"],[qkr-tmpl]').each(function (i, elem) {
            quikr.applyTmpl(elem);
        });
        jQuery("body").on("click", '[qkr-action]', function (e) {
            var elem = e.target;
            var action = elem.getAttribute("qkr-action");

            var getUrl = elem.getAttribute("get-url") || ((action=="qkr-get") ? elem.getAttribute("qkr-url") : null);
            var postUrl = elem.getAttribute("post-url") || ((action=="qkr-post") ? elem.getAttribute("qkr-url") : null);

            var callback = function (resp) {
                if (typeof quikr._actions_[action] === "function") {
                    quikr._actions_[action].call(elem, resp);
                }
            };
            var data = {};
            for (var key in elem.dataset) {
                if (elem.dataset[key].indexOf("?") == 0) {
                    data[key] = root.prompt(elem.dataset[key].substr(1) || key, "");
                } else {
                    data[key] = elem.dataset[key];
                }
            }
            if (getUrl) {
                jQuery.get(getUrl, data).done(callback);
            } else if (postUrl) {
                jQuery.post(postUrl, data).done(callback);
            } else {
                callback(data);
            }
        });
    };

    quikr.action("qkr-reload", function (data) {
        var tmpl = this.getAttribute("qkr-tmpl");
        quikr.applyTmpl(document.getElementById(tmpl));
    });

    function loadImage(el, options) {
        var status = el.getAttribute('quikr-status');
        var prop = "data-src";
        if (status == "loaded") {
            return;
        } else if (status == "error") {
            var srcs = [];
            for (var i = 0; i < el.attributes.length; i++) {
                if (/data-src-?[0-9]*/.test(el.attributes[i].name)) {
                    srcs.push(el.attributes[i].name)
                }
            }
            srcs = srcs.sort();
            if (!srcs.length) {
                // return;
            }
            prop = srcs.shift();
        }
        var img = el.img || new Image()
            , src = el.getAttribute(prop);
        el.removeAttribute(prop);
        if (!src) {
            //Contiune to Set Callbacks only
            // return;
        }
        if (options.blank && !el.src) {
            el.src = el.src || src;
        }

        img.onload = src ? function () {
            if (!!el.parent)
                el.parent.replaceChild(img, el)
            else if (src && status != "loaded") {
                el.src = src;
                el.setAttribute('quikr-status', 'loaded');
            }
        } : img.onload;

        if (!options["404"]) {
            //console.error("NO OPTIONS=",el, options);
        }
        img.onerror = img.onerror || function () {
                el.setAttribute('quikr-status', 'error');
                el.setAttribute('quikr-img-error', img.src);
                if (options["404"]) {
                    el.src = options["404"];
                } else {
                    //console.error("NO OPTIONS==",el, options);
                }
                loadImage(el, {404: options["404"], blank: options.blank});
            };
        var onerror = options.error || options;
        if (typeof onerror == "function") {
            var old_onerror = img.onerror;
            img.onerror = function () {
                old_onerror.apply(this, arguments);
                return onerror.apply(this, arguments);
            }
        }
        if (src) {
            img.src = src;
            el.setAttribute('quikr-status', 'loading');
            el.setAttribute('quikr-img-loading', img.src);
        } else if (img && typeof img.onerror == 'function') {
            //img.onerror(src);
            //WARNING : Triggers Infinite Loop
        }
        el.img = img;
    }

    function elementInViewport(el) {
        var rect = el.getBoundingClientRect()

        return (
            rect.top >= 0
            && rect.left >= 0
            && rect.top <= (window.innerHeight || document.documentElement.clientHeight)
        )
    }

    jQuery.fn.loadLazyImages = function (options, _force) {
        var force = _force || true;
        this.each(function (i, elem) {
            if (force || elementInViewport(elem)) {
                loadImage(elem, options || {});
            }
        })
    };
    var loadLazyImages = function (options, _force) {
        if (options === true || options === false) {
            var __force = options;
            options = _force;
            _force = __force;
        }
        var force = _force || false;
        images = jQuery('img[data-src],img[quikr-status="error"]');
        for (var i = 0; i < images.length; i++) {
            if (force || elementInViewport(images[i])) {
                loadImage(images[i], options || {});
            }
        }
        ;
    };
    quikr.loadLazyImages = loadLazyImages;

    root.quikr = quikr;
})(this);
