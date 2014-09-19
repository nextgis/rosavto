## -*- coding: utf-8 -*-

<%
    tabs = [
    ('map', u'Карта'),
    ('layer', u'Слой'),
    ('marker', u'Маркер'),
    ('wms', u'WMS'),
    ('realtime', u'Realtime'),
    ('attributes', u'Аттрибуты'),
    ('center', u'Центрирование'),
    ('incident', u'Происшествия'),
    ('routing_sample', u'Маршруты'),
    ('routing_chainage_sample', u'Маршруты по пикетажу'),
    ('clusters', u'Кластеры с состояниями'),
    ('time', u'Время'),
    ('sensors', u'Датчики'),
    ('code', u'Код')
]
%>

<nav class="nav-tabs">
    <ul>
        % for tab in tabs:
            % if request.matched_route.name == tab[0]:
                <li><span>${tab[1]}</span></li>
            % else:
                <li><a href="${request.route_url(tab[0])}">${tab[1]}</a></li>
            % endif
        % endfor
    </ul>
</nav>