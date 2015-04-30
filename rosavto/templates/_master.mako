<!DOCTYPE html>
<html>
<head>
    <title><%block name="title"/></title>
    <link type="text/css" rel="stylesheet"
          href="${request.static_url('rosavto:static/contrib/materialize/css/customize.css')}"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
    <link rel="stylesheet" href="${request.static_url('rosavto:static/js/leaflet/leaflet.css')}"/>
    <link rel="stylesheet" href="${request.static_url('rosavto:static/css/widget.css')}"/>
    <link rel="stylesheet" href="${request.static_url('rosavto:static/css/main.css')}"/>
##    <link rel="stylesheet" href="${request.static_url('rosavto:static/contrib/prism/prism.css')}"/>
##    <link rel="stylesheet" href="http://yandex.st/highlightjs/8.0/styles/default.min.css">
</head>
<body>

    <%include file='_navigation.mako'/>

<main>
    <div class="section" id="index-banner">
        <div class="container">
            <div class="row">
                <div class="col s12 m9">
                    <h1 class="header center-on-small-only">Демо-стенд</h1>
                    <h4 class="light indigo-text text-lighten-4 center-on-small-only">Демонстрация виджетов к системе
                        NextGIS Web.</h4>
                </div>
                <div class="col s12 m3">
                    <!-- BuySellAds Zone Code -->
                    <div class="buysellads-header center-on-small-only">
                        <

                    </div>
                    <!-- End BuySellAds Zone Code -->
                </div>
            </div>
        </div>
    </div>

    <div class="container">

    ${self.body()}

    </div>

</main>
<footer class="page-footer">
    <div class="footer-copyright">
        <div class="container">
            © 2014-2015 NextGIS, All rights reserved.
            ##            <a class="grey-text text-lighten-4 right" href="https://github.com/Dogfalo/materialize/blob/master/LICENSE">MIT
            ##                License</a>
                    </div>
    </div>
</footer>


<script type="text/javascript"
        src="${request.static_url('rosavto:static/contrib/jquery/jquery-2.1.3.min.js')}"></script>
<script type="text/javascript"
        src="${request.static_url('rosavto:static/contrib/materialize/js/materialize.min.js')}"></script>
<script type="text/javascript"
        src="${request.static_url('rosavto:static/contrib/materialize/js/init.js')}"></script>

<script>
    var application_root = '${request.application_url}',
            ngwUrlForTiles = '${request.registry.settings['proxy_ngw']}',
            ngwProxyUrl = application_root + '/ngw/',
            Monitoring = {
                url: '${request.registry.settings['proxy_cit']}monitoring-web',
                contextPath: '${request.registry.settings['proxy_cit']}monitoring-web/',
                getApplication: function () {
                    return {
                        fireEvent: function (event, featureId, histDate) {
                            console.log('Monitoring event was fired.');
                        }
                    }
                }

            },
            dojoConfig = {
                isDebug: true,
                async: true,
                ##                cacheBust: true,
                baseUrl: "${request.static_url('rosavto:static/js/')}",
                packages: [
                    {name: "rosavto", location: 'rosavto'},
                    {name: "proj4js", location: 'proj4js'},
                    {name: "mustache", location: 'mustache'},
                    {name: 'leaflet', location: 'leaflet'},
                    {name: 'centreit', location: 'centreit'},
                    {name: 'stomp', location: 'stomp'},
                    {name: 'sockjs', location: 'sockjs'}
                ]
            };
</script>

<script src="//ajax.googleapis.com/ajax/libs/dojo/1.9.2/dojo/dojo.js"></script>
##<script src="http://yandex.st/highlightjs/8.0/highlight.min.js"></script>
##<script>hljs.initHighlightingOnLoad();</script>
##<link rel="stylesheet" href="${request.static_url('rosavto:static/contrib/prism/prism.js')}"/>
<script src="${request.static_url('rosavto:static/js/sockjs/sockjs.js')}"></script>
<script src="${request.static_url('rosavto:static/js/stomp/stomp.js')}"></script>
<script src="${request.static_url('rosavto:static/js/centreit/MonitoringCard.js')}"></script>
<%block name="inlineScripts"/>
</body>
</html>