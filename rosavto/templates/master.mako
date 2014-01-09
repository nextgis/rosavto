<!DOCTYPE html>
<html>
<head>
    <title><%block name="title"/></title>
    <meta http-equiv="Content-Type" content="text/html;charset=UTF-8"/>
    <meta name="keywords" content="python web application"/>
    <meta name="description" content="pyramid web application"/>

    <link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet-0.7.1/leaflet.css" />
    <link rel="stylesheet" href="${request.static_url('rosavto:static/css/bootstrap.3.0.3.min.css')}">
    <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/highlight.js/7.4/styles/default.min.css">
    <link rel="stylesheet" href="${request.static_url('rosavto:static/css/main.css')}">
</head>
<body>

<%include file='tabs.mako'/>

${self.body()}

<script>
    var application_root = '${request.application_url}',
            dojoConfig = {
                async: true,
                baseUrl: "${request.static_url('rosavto:static/js/')}",
                packages: [
                    { name: "rosavto", location: 'rosavto' }
                ]
            };
</script>
<script src="//ajax.googleapis.com/ajax/libs/dojo/1.9.2/dojo/dojo.js"></script>
<script src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/7.4/highlight.min.js"></script>
<script src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/7.4/lang/javascript.min.js"></script>

<script src="${request.static_url('rosavto:static/js/socket/SockJS.js')}"></script>
<script src="${request.static_url('rosavto:static/js/socket/Stomp.js')}"></script>

<script>hljs.initHighlightingOnLoad();</script>
<script>
    <%block name="inlineScripts"/>
</script>
</body>
</html>