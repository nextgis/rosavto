L.Control.IncidentEditor = L.Control.extend({
    options: {
        position: 'topleft',
        modes: ['point', 'line'],
        pointModeText: 'Создать точку происшествия',
        lineModeText: 'Создать отрезок происшествия'
    },

    onAdd: function (map) {
        var incidentName = 'incident-editor',
            container = L.DomUtil.create('div', incidentName + '-bar'),
            options = this.options,
            modesCount = options.modes.length,
            i,
            modeName;

        if (modesCount > 2) {
            for (i = 0; i < modesCount; i += 1) {
                modeName = options.modes[i];
                this._createButton(options[modeName + 'ModeText'], incidentName + modeName + '-mode', container, this._turnOnMode);
            }
        }
    },

    _createButton: function (title, className, container, fn) {
        var link = L.DomUtil.create('a', className, container);
        link.href = '#';
        link.title = title;

        L.DomEvent
            .on(link, 'mousedown dblclick', L.DomEvent.stopPropagation)
            .on(link, 'click', L.DomEvent.stop)
            .on(link, 'click', fn, this);

        return link;
    },

    _turnOnMode: function () {

    }
});