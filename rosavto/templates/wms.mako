<%inherit file="_master.mako"/>

<%block name="title">Карта + WMS</%block>

<div class="row">
    <div class="section col s12 m9 l10">
        <div id="description" class="row scrollspy">
            <h2 class="col s12 header">Описание</h2>
            <p>Демонстрация подключения WMS слоя к картографическому виджету</p>
        </div>
    </div>

    <div id="demo" class="section col s12 m9 l10">
        <h2 class="col s12 header">Демо</h2>
        <div id="map"></div>
    </div>


##    <div class="section col s12 m9 l10">
##        <pre data-start="1"><code class="language-js">
##            <%include file='_js_scripts.mako'/>
##        </code></pre>
##        <pre class="line-numbers" data-src="${request.static_url('rosavto:static/js/pages/' + request.matched_route.name + '.js')}"></pre>
##    </div>

    <!-- Table of contents -->
    <div class="col hide-on-small-only m3 l2">
        <div class="toc-wrapper">
            <div style="height: 1px;">
                <ul class="table-of-contents">
                    <li><a href="#description">Описание</a></li>
                    <li><a href="#demo">Демо</a></li>
                </ul>
            </div>
        </div>
    </div>
</div>

<%block name="inlineScripts">
    <script type="text/javascript"
            src="${request.static_url('rosavto:static/js/pages/' + request.matched_route.name + '.js')}"></script>
</%block>