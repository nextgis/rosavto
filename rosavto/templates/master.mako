<!DOCTYPE html>
<html>
<head>
    <title><%block name="title"/></title>
    <meta http-equiv="Content-Type" content="text/html;charset=UTF-8"/>
    <meta name="keywords" content="python web application"/>
    <meta name="description" content="pyramid web application"/>

    <link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet-0.7.1/leaflet.css"/>
    <link rel="stylesheet" href="${request.static_url('rosavto:static/css/bootstrap.3.0.3.min.css')}">
    <link rel="stylesheet" href="${request.static_url('rosavto:static/css/main.css')}">

    <script>
        var application_root = '${request.application_url}',
                dojoConfig = {
                    async: true,
                    baseUrl: "${request.static_url('rosavto:static/js/')}",
                    packages: [
                        { name: "rosavto", location: 'rosavto' },
                        { name: "proj4js", location: 'proj4js' }
                    ]
                };
    </script>
    <script src="//ajax.googleapis.com/ajax/libs/dojo/1.9.2/dojo/dojo.js"></script>

    <link rel="stylesheet" href="${request.static_url('rosavto:static/js/rainbow/solarized-light.css')}">
    <script src="${request.static_url('rosavto:static/js/rainbow/rainbow-custom.min.js')}"></script>


    <script src="${request.static_url('rosavto:static/js/socket/SockJS.js')}"></script>
    <script src="${request.static_url('rosavto:static/js/socket/Stomp.js')}"></script>

    <script>
        <%block name="inlineScripts"/>
    </script>
</head>
<body onload="window.scrollTo(0,0)">
    <%include file='tabs.mako'/>

    ${self.body()}

</body>
</html>