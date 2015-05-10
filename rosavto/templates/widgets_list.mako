<% import rosavto.navigation as navigation %>

<%inherit file="_master.mako"/>

<div class="row">
    <div class="section col s12 m9 l10">
        <div id="nav_description" class="row">
            <div class="row">
                <h2 class="col s12 header">${parent.title()}</h2>
            </div>
            <div class="row">
                <div class="col s12 m6">
                    <div class="card blue-grey darken-1">
                        <div class="card-content white-text">
                            <span class="card-title">Card Title</span>

                            <p>I am a very simple card. I am good at containing small bits of information.
                                I am convenient because I require little markup to use effectively.</p>
                        </div>
                        <div class="card-action">
                            <a href="#">This is a link</a>
                            <a href='#'>This is a link</a>
                        </div>
                    </div>
                </div>
                <div class="col s12 m6">
                    <div class="card blue-grey darken-1">
                        <div class="card-content white-text">
                            <span class="card-title">Card Title</span>

                            <p>I am a very simple card. I am good at containing small bits of information.
                                I am convenient because I require little mardkup to use effectively.</p>
                        </div>
                        <div class="card-action">
                            <a href="#">This is a link</a>
                            <a href='#'>This is a link</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<%block name="inlineScripts">
    <script src="${request.static_url('rosavto:static/js/pages/' + request.matched_route.name + '.js')}"></script>
</%block>