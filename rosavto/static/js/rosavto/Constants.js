define(['dojo/_base/declare'],
    function (declare) {
        var Constants = declare('rosavto.Constants', [], {
            RealtimeLayer: 'Rl',
            SensorsLayer: 'Sl',
            TileLayer: 'Tl'
        });

        if (!_instance) {
            var _instance = new Constants();
        }

        return _instance;
    });