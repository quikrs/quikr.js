# quikr.js
A micro framework for small applications, almost all logic on server.

## Inline Template
```html

<ul id="my_template_id" qkr-tmpl url-items="/get/all/items">
  <% for(var i in items){ %>
    <li> 
      <%= item[i].title %>
    </li>
  <% } %>
</ul>
```
### Attributes

#### [qkr-tmpl]
No Value specified - To tell quikr to compile this template and render it right there 

#### [url-items=url]
will fetch items from *url* and pass it to template for rendering.

##### Custom URL interceptor 
Somtimee we dont want to get data from server , rather get fetch from local function or localStorage or may be with some cache fallback.
```javascript
  quikr.url("my-custom-url", function(data){
    var elem = this;
    var params = data;
    //do something. or make another ajax request or return promise. $.get("/actual_url");
  })
```



## Global Template
```html
  <!-- Define Template -->
  <script type="text/qkr-tmpl" id="my_template" >
      <% for(var i in items){ %>
    <li> 
      <%= item[i].title %>
    </li>
  <% } %>
  </script>
  
  <!-- To use template -->
  <ul id="my_section_1" qkr-tmpl="my_template" url-items="/get/all/items">
  </ul>
  
  <!-- To use template  again -->
  <ul id="my_section_2" qkr-tmpl="my_template" url-items="/get/sold/items">
  </ul>
  
```
#### [qkr-tmpl="my_template"]
template_id - To tell quikr to render this div using *my_template*


## Re-Rendering Template
```javascript
  quikr.applyTmpl(document.getElementById("my_section_1"));
```

## Action Buttons

```html
<button qkr-action="show_alert">Show Alert</button>
<button qkr-action="qkr-reload" qkr-tmpl="mycart2">Refresh</button>
```
### Attributes

#### qkr-action
Action which is to be taken on click (by default onclick is event)
It has following options avaialble
- **qkr-reload** - Reloads template based on addition attributes **qkr-target** 
- **qkr-post** - makes post request with on **qkr-url**, with dataset as post params
- **qkr-get**  - makes get request with on **qkr-url** with dataset as query params
- **custom action** -  you can define your own actions with **quikr.action** api
```javascript
  quikr.action("my-custom-action", function(data){
    var elem = this;
    var params = data;
    //do something.
  })
```

And in your javascript?

```javascript

window.onload = function() {
  quikr.init();
};

```


## Lazy Image Loading
quikr makes it easy to load your images lazily without blocking rendering of your document. No need to download any plugin. Simply change your syntax.


```html
<img src="loading.gif" data-src="http://my_actual_image.jpg" />

```
If you want fallbacks for your images, in case it failed to load

```html
<img src="loading.gif" data-src="http://my_actual_image.jpg" 
        data-src2="http://try_my_actual_image_from_server2.jpg"  
        data-src3="http://please_one more_time_my_actual_image_from_Server3.jpg" />
```

And in your javascript?

```javascript
window.onload = function() {
    quikr.loadLazyImages({
        "blank" : "loading.gif",
        "404" : "no_image_found.gif",
        "error" :  function() {
          //callback if image not found
        }
    });
}
```














