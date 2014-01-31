MonitoringCard = {

    showCard: function(guid) {

        require(["dojo/topic"], function(topic){
            topic.publish('marker/attributes/get', guid);
        });
    }

}
