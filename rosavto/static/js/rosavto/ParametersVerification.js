define(['dojo/_base/declare'],
    function (declare) {
        return declare('rosavto.ParametersVerification', null, {
            verificateRequiredParameters: function (settings, arrayParameters) {
                var countVerificatedParameters = arrayParameters.length,
                    i = 0,
                    message;
                for (i; i < countVerificatedParameters; i += 1) {
                    if (!settings.hasOwnProperty(arrayParameters[i])) {
                        message = '"' + arrayParameters[i] + '" property is not defined';
                        if (console) {
                            console.log(message);
                        }
                        throw message;
                    }
                }
            }
        });
    });
