## -*- coding: utf-8 -*-

<%
    tabs = [
    ('map', u'Карта'),
    ('layer', u'Карта + слой'),
    ('marker', u'Маркер'),
    ('wms', u'Карта + WMS')
]
%>

<div id="tabs">
    <ul class="nav nav-tabs">
        % for tab in tabs:
            <% class_name = 'active' if request.matched_route.name == tab[0] else '' %>
            <li class="${class_name}"><a href="${request.route_url(tab[0])}">${tab[1]}</a></li>
        % endfor
    </ul>
</div>