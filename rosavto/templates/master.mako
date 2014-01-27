<!DOCTYPE html>
<html>
<head>
    <title><%block name="title"/></title>
    <meta http-equiv="Content-Type" content="text/html;charset=UTF-8"/>

    <link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet-0.7.1/leaflet.css"/>
    <link rel="stylesheet" href="${request.static_url('rosavto:static/css/kube.min.css')}"/>
    <link rel="stylesheet" href="${request.static_url('rosavto:static/css/main.css')}"/>

    <script>
        var application_root = '${request.application_url}',
            ngwUrlBase = 'http://demo.nextgis.ru/ngw_rosavto/',
            proxyUrl = application_root + '/proxy',

            // Dojo's config
            dojoConfig = {
                async: true,
                baseUrl: "${request.static_url('rosavto:static/js/')}",
                packages: [
                    { name: "rosavto", location: 'rosavto' },
                    { name: "proj4js", location: 'proj4js' },
                    { name: "mustache", location: 'mustache' }
                ]
            };
    </script>

    <script src="//ajax.googleapis.com/ajax/libs/dojo/1.9.2/dojo/dojo.js"></script>

    <link rel="stylesheet" href="http://yandex.st/highlightjs/8.0/styles/default.min.css">
    <script src="http://yandex.st/highlightjs/8.0/highlight.min.js"></script>
    <script>hljs.initHighlightingOnLoad();</script>


    <script src="${request.static_url('rosavto:static/js/socket/SockJS.js')}"></script>
    <script src="${request.static_url('rosavto:static/js/socket/Stomp.js')}"></script>

    <script>
        <%block name="inlineScripts"/>
    </script>
</head>
<body >
    <%include file='tabs.mako'/>

    ${self.body()}

</body>
</html>