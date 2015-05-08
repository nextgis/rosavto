<%inherit file="_master.mako"/>

<div class="row">
    <div class="section col s12 m9 l10">
        <div id="nav_description" class="row scrollspy">
            <div class="row">
                <h2 class="col s12 header">${parent.title()}</h2>
            </div>
            <div class="row">
                <p>Демонстрация подключения WMS слоя к картографическому виджету.</p>
            </div>
        </div>
        <div id="nav_demo" class="row scrollspy">
            <div class="row">
                <h3 class="col s12 header">Демо</h3>
            </div>
            <div class="row">
                <div id="map">
                    <p class="loaded-status">Построение демо-карты...</p>
                </div>
            </div>
        </div>
        <div id="nav_source_code" class="row scrollspy">
            <div class="row">
                <h3 class="col s12 header">Пример кода</h3>
            </div>
            <div class="row">
                <pre data-src="${request.static_url('rosavto:static/js/pages/' + request.matched_route.name + '.js')}"
                     class="line-numbers">
                </pre>
            </div>
        </div>
    </div>

    <!-- Sub-navigation table of contents -->
    <%
        sub_navs = [
            ('nav_description', u'Описание'),
            ('nav_demo', u'Демо'),
            ('nav_source_code', u'Пример кода')
        ]
    %>
    <%include file='_sub_navigation.mako' args='sub_navs=sub_navs'/>
</div>

<%block name="inlineScripts">
    <script src="${request.static_url('rosavto:static/js/pages/' + request.matched_route.name + '.js')}"></script>
</%block>