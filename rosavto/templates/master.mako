<!DOCTYPE html>
<html>
<head>
    <title><%block name="title"/></title>
    <meta http-equiv="Content-Type" content="text/html;charset=UTF-8"/>
    <meta name="keywords" content="python web application"/>
    <meta name="description" content="pyramid web application"/>

    <link rel="stylesheet" href="//netdna.bootstrapcdn.com/bootstrap/3.0.3/css/bootstrap.min.css">
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
<script>
    require(['dojo/ready', 'rosavto/Map'], function (ready, Map) {
        ready(function () {
            (new Map()).placeAt('map');
        });
    });
</script>
</body>
</html>