<%inherit file="_master.mako"/>

<%block name="title">Тайловые слои NGW</%block>

<div class="row">
    <div class="section col s12 m9 l10">
        <div id="nav_description" class="row scrollspy">
            <h2 class="col s12 header">Описание</h2>

            <p>Демонстрация подключения тайловых слоев, которыми управляет NextGIS Web. Список слоев получается из NextGIS Web.</p>
        </div>
    </div>

    <div id="nav_demo" class="section col s12 m9 l10">
        <div class="row">
            <h2 class="col s12 header">Демо</h2>
        </div>
        <div class="row">
            <div id="map">
                <p class="loaded-status">Построение демо-карты...</p>
            </div>
        </div>
    </div>

    <div id="nav_source_code" class="section col s12 m9 l10">
        <div class="row">
            <h2 class="col s12 header">Пример кода</h2>
        </div>
        <div class="row">
            <pre data-src="${request.static_url('rosavto:static/js/pages/' + request.matched_route.name + '.js')}"
                 class="line-numbers">
            </pre>
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