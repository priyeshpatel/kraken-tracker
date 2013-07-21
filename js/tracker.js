/*
Kraken Tracker
tracker.js
Priyesh Patel 2013
*/

jQuery(document).ready(function($) { google.maps.event.addDomListener(window, 'load', function() {
    var first_load = true;

    $('#sidebar-main').css('bottom', $('#sidebar-bottom').outerHeight());
    $('#graph').css('width', $('#graph-panel').width());

    var plotPoints = window.location.search.replace('?', '').replace('/', '');
    if (plotPoints == "all") {
        plotPoints = 999999999;
    } else {
        plotPoints = parseInt(plotPoints);
        if (!plotPoints) {
            window.location.search = 'all';
            plotPoints = 999999999;
        }
    }

    function round(value, dp) {
        return Math.round(value * Math.pow(10, dp)) / Math.pow(10, dp);
    }

    function truncate(value) {
        if (value < 0)
            return Math.ceil(value);
        return Math.floor(value);
    }

    function deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    function format(field, value) {
        switch(field) {
            case 'id':
                return value;
            case 'sentenceid':
                return value;
            case 'datetime':
                return value.format("D MMM YYYY HH:mm:ss") + " UTC";
            case 'datetime_compact':
                return value.format("D MMM YYYY @ HH:mm");
            case 'latitude':
            case 'longitude':
                return round(value, 6) + "&deg;";
            case 'position':
                return format('latitude', value[0]) + ",&nbsp;" + format('longitude', value[1]);
            case 'altitude':
                return round(value, 3) + "mm";
            case 'satellites':
                return value + " satellites";
            case 'temperature':
                return round(value, 2) + "&deg;C";
            case 'battery':
                return round(value, 2) + "V";
            case 'milliseconds':
                var duration = moment.duration(value);
                var days = truncate(duration.asDays());
                var hours = duration.hours();
                return days + " days " +  hours + " hours";
            case 'milliseconds_small':
                var duration = moment.duration(value);
                var hours = truncate(duration.asHours());
                var minutes = duration.minutes();
                return hours + " hours " + minutes + " minutes";
            case 'speed':
                return round(value, 2) + "m/s";
        }
    }

    function getField(doc, field, formatted) {
        if(typeof(formatted) === 'undefined') formatted = false;

        var value;

        switch(field) {
            case 'id':
                value = doc['_id'];
                break;
            case 'sentenceid':
                value = doc['data']['sentence_id'];
                break;
            case 'datetime':
            case 'datetime_compact':
                value = moment(doc['receivers']['kraken']['time_created']).utc();
                break;
            case 'latitude':
                value = doc['data']['latitude'];
                break;
            case 'longitude':
                value = doc['data']['longitude'];
                break;
            case 'position':
                value = [getField(doc, 'latitude'), getField(doc, 'longitude')];
                break;
            case 'altitude':
                value = doc['data']['altitude'] * 1000;
                break;
            case 'satellites':
                value = doc['data']['satellites'];
                break;
            case 'temperature':
                value = doc['data']['temperature_internal'];
                break;
            case 'battery':
                value = doc['data']['battery'];
                break;
        }

        if (formatted) return format(field, value);

        return value;
    }

    function distanceBetween(pos1, pos2) {
        var R = 6371; // Radius of the earth in km
        var dLat = deg2rad(pos2[0] - pos1[0]);
        var dLon = deg2rad(pos2[1] - pos1[1]); 
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(pos1[0])) * Math.cos(deg2rad(pos2[0])) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
        var d = R * c;
        return d;
    }

    function makeDescription(doc) {
        var desc = "<div class='transmission-info-window'>";
        desc += "<h5>Transmission " + getField(doc, 'sentenceid', true) + "</h5>";
        desc += "<p><strong>Date:</strong> " + getField(doc, 'datetime', true) + "</p>";
        desc += "<p><strong>Position:</strong> " + getField(doc, 'position', true) + "</p>";
        desc += "<p><strong><abbr title='Height Above Mean Sea Level'>AMSL</abbr>:</strong> " + getField(doc, 'altitude', true) + "</p>";
        desc += "<p><strong>GPS Satellites:</strong> " + getField(doc, 'satellites', true) + "</p>";
        desc += "<p><strong>Temperature:</strong> " + getField(doc, 'temperature', true) + "</p>";
        desc += "<p><strong>Battery Voltage:</strong> " + getField(doc, 'battery', true) + "</p>";
        if (doc['data']['_parsed']['configuration_sentence_index'] == 1) {
            desc += "<p><a href='http://track.poseidon.sgsphysics.co.uk/imu.php?transmission=" + doc['_id'] + "' target='_blank'>IMU Data</a></p>";
        }
        desc += "</div>";
        return desc;
    }

    var graphOpen = false;
    var imuOpen = false;

    var graph_data = {
        'altitude': [],
        'satellites': [],
        'temperature': [],
        'battery': []
    };
    var graph_units = {
        'altitude': 'mm',
        'satellites': '',
        'temperature': '&deg;C',
        'battery': 'V'
    };

    var current_graph = '';

    $(window).resize(function() {
        google.maps.event.trigger(map, 'resize');
        $('#graph').css('width', $('#graph-panel').width());
        plot(current_graph);

        if ($(window).width() > 720) {
            $('#sidebar-main').css('bottom', $('#sidebar-bottom').outerHeight() + 'px');
        } else {
            $('#sidebar-main').css('bottom', '0px');
            $('#google-map').css('left', '240px').css('bottom', '0');
            $('#graph-panel').css('display', 'none').css('left', '240px').css('bottom', '-270px');
            $('#imu-panel').css('display', 'none').css('left', '0');
            $('#bottom').css('bottom', '0');
            imuOpen = false;
            graphOpen = false;
        }
    });

    function tooltip(x, y, contents, flip) {
        var t = $('<div id="graph-tooltip">' + contents + '</div>').appendTo('body');
        t.css({
            'top': y - 25,
            'left': flip ? x - 5 - t.outerWidth() : x + 5
        });
        t.fadeIn(200);
    }

    function plot(series) {
        if (!graphOpen) return;
        if (series == '') graph_close();

        $.plot('#graph', [{
            data: graph_data[series], 
            color: 'rgb(26, 188, 156)'
        }], {
            series: {
                lines: { show: true },
                points: { show: true }
            },
            xaxis: { 
                mode: 'time',
                timeformat: '%d %b %y',
                minTickSize: [1, "day"]
            },
            yaxis: {
                tickFormatter: function(val, axis) {
                    if (series == 'satellites')
                        return val + graph_units[series];
                    return val.toFixed(axis.tickDecimals) + graph_units[series];
                },
                minTickSize: series == 'satellites' ? 1 : 0.1
            },
            grid: {
                borderColor: 'rgb(127, 140, 141)',
                clickable: true,
                hoverable: true
            }
        });

        var prevPoint = null;

        $('#graph').unbind('plothover');
        $('#graph').bind('plothover', function(event, pos, item) {
            if (!item) {
                $('#graph-tooltip').remove();
                prevPoint = null;
                return;
            }

            if (prevPoint == item.dataIndex) return;
            prevPoint = item.dataIndex;

            $('#graph-tooltip').remove();

            var x = format('datetime_compact', moment(item.datapoint[0]).utc());
            var y = item.datapoint[1].toFixed(2);
            if (series == 'altitude' || series == 'satellites')
                y = Math.round(item.datapoint[1]);

            tooltip(item.pageX, item.pageY, x + ": " + y + graph_units[series], item.dataIndex > graph_data[series].length/2);
        });

        $('.graph-btn').removeClass('btn-primary');
        $('#graph-' + series).addClass('btn-primary');

        current_graph = series;

        window.location.hash = series;
    }

    function graph_open(series) {
        if (imuOpen) {
            imu_close();
            setTimeout(function() {
                graph_open(series);
            }, 400);
            return;
        }
        graphOpen = true;
        $('#graph-panel').css('display', 'block').animate({
            bottom: '0'
        }, 400, 'swing');
        $('#google-map').animate({
            bottom: '270px'
        }, 400, 'swing');
        $('#bottom').animate({
            bottom: '270px'
        }, 400, 'swing');
        plot(series);
    }

    function graph_close() {
        graphOpen = false;
        window.location.hash = '';
        $('#graph-panel').animate({
            bottom: '-270px'
        }, 400, 'swing', function() {
            $(this).css('display', 'none');
        });
        $('#google-map').animate({
            bottom: '0'
        }, 400, 'swing');
        $('#bottom').animate({
            bottom: '0'
        }, 400, 'swing');
    }

    $('#open-graph').click(function() {
        if (graphOpen) {
            graph_close();
        } else {
            graph_open('battery');
        }
        return false;
    });

    function imu_open() {
        if (graphOpen) {
            graph_close();
            setTimeout(imu_open, 400);
            return;
        }
        imuOpen = true;
        window.location.hash = 'imu';
        $('#imu-panel').css('display', 'block').animate({
            left: '240px'
        }, 400, 'swing');
        $('#google-map').animate({
            left: '480px'
        }, 400, 'swing');
        $('#graph-panel').animate({
            left: '480px'
        }, 400, 'swing');
    }

    function imu_close() {
        imuOpen = false;
        window.location.hash = '';
        $('#imu-panel').animate({
            left: '0'
        }, 400, 'swing', function() {
            $(this).css('display', 'none');
        });
        $('#google-map').animate({
            left: '240px'
        }, 400, 'swing');
        $('#graph-panel').animate({
            left: '240px'
        }, 400, 'swing');
    }

    $('#open-imu').click(function() {
        if (imuOpen) {
            imu_close();
        } else {
            imu_open();
        }
        return false;
    });

    $('#graph-altitude').click(function() {
        plot('altitude');
        return false;
    });
    $('#graph-satellites').click(function() {
        plot('satellites');
        return false;
    });
    $('#graph-temperature').click(function() {
        plot('temperature');
        return false;
    });
    $('#graph-battery').click(function() {
        plot('battery');
        return false;
    });

    switch(window.location.hash.split('#')[1]) {
        case 'imu':
            imu_open();
            break;
        case 'altitude':
        case 'satellites':
        case 'temperature':
        case 'battery':
            graph_open(window.location.hash.split('#')[1]);
            break;
    }

    google.maps.visualRefresh = true;
    var map = new google.maps.Map(document.getElementById("google-map"), {
        center: new google.maps.LatLng(55.0878, -9.806156),
        zoom: 8,
        mapTypeId: google.maps.MapTypeId.TERRAIN,
        streetViewControl: false,
        minZoom: 3
    });

    var infoWindow = new google.maps.InfoWindow({
        maxWidth: 400
    });

    var regularIcon = {
        url: "/img/marker.png",
        anchor: new google.maps.Point(6, 6)
    };
    var regularIconHover = {
        url: "/img/marker-hover.png",
        anchor: new google.maps.Point(6, 6)
    };
    var lastIcon = {
        url: "/img/current-location-marker.png",
        anchor: new google.maps.Point(26, 14)
    };

    var map_markers = [];
    var map_lines = [];

    function update() {
        $.ajax({
            url: "http://track.poseidon.sgsphysics.co.uk/data.php",
            dataType: "json",
            cache: false
        }).done(function (data) {
            var docs = data['rows'];

            if (docs.length == 0) {
                $('#next-transmission').html("We haven't launched yet!");

                $.ajax({
                    url: "http://track.poseidon.sgsphysics.co.uk/config.php",
                    dataType: "json",
                    cache: false
                }).done(function (data) {
                    var message = data['message'];
                    $('#message p strong').html(message);
                    if (message == "") {
                        $('#message').hide();
                    } else {
                        $('#message').show();
                    }
                });

                setTimeout(update, 3600000);
                $('#updated').html("Last updated at " + moment().format('HH:mm:ss'));
            }

            var first = docs[0]['doc'];
            var last = docs.slice(-1)[0]['doc'];
            var prev = docs.slice(-2)[0]['doc'];

            if (first_load) {
                map.panTo(new google.maps.LatLng(getField(last, 'latitude'), getField(last, 'longitude')));
                first_load = false;
            }

            var lastTransmissionTime = moment().utc().diff(getField(last, 'datetime'));
            $('#last-ago').html(format('milliseconds_small', lastTransmissionTime) + " ago");

            var nextTransmissionTime;

            $.ajax({
                url: "http://track.poseidon.sgsphysics.co.uk/config.php",
                dataType: "json",
                cache: false
            }).done(function (data) {
                var transmissionFrequency = data['transmission_frequency'];
                transmissionFrequency += 5;
                nextTransmissionTime = getField(last, 'datetime').add('minutes', transmissionFrequency).diff(moment().utc());
                $('#next-transmission').html(format('milliseconds_small', nextTransmissionTime));

                var message = data['message'];
                $('#message p strong').html(message);
                if (message == "") {
                    $('#message').hide();
                } else {
                    $('#message').show();
                }
            });

            $.each(['sentenceid', 'datetime', 'position', 'altitude', 'satellites', 'temperature', 'battery'], function(index, val) {
                $('#last-' + val).html(getField(last, val, true));
            });

            var last_distance = distanceBetween(getField(last, 'position'), getField(prev, 'position')) * 1000;
            var last_time = getField(last, 'datetime').diff(getField(prev, 'datetime')) / 1000;
            var last_speed = last_distance / last_time;
            $('#last-speed').html(format('speed', last_speed));

            for (j in map_lines) {
                map_lines[j].setMap(null);
                delete map_lines[j];
            }
            map_lines.length = 0;

            var lineLength = docs.length > plotPoints ? plotPoints : docs.length;
            var pointsStart = docs.length - lineLength;
            for (var i = 1; i < lineLength; i++) {
                var position = new google.maps.LatLng(getField(docs[pointsStart + i]['doc'], 'latitude'), getField(docs[pointsStart + i]['doc'], 'longitude'));
                var prevPosition = new google.maps.LatLng(getField(docs[pointsStart - 1 + i]['doc'], 'latitude'), getField(docs[pointsStart - 1 + i]['doc'], 'longitude'));
                var lineSegment = new google.maps.Polyline({
                    strokeColor: "#8E44AD",
                    strokeWeight: 3,
                    strokeOpacity: i / lineLength,
                    map: map
                });
                var path = lineSegment.getPath();
                path.push(prevPosition);
                path.push(position);
                map_lines.push(lineSegment);
            }

            var minTemp = 1000;
            var maxTemp = -1000;
            var totalDistance = 0;

            for (j in map_markers) {
                map_markers[j].setMap(null);
                delete map_markers[j];
            }
            map_markers.length = 0;

            $('#imu-panel ul').html('');

            graph_data['altitude'] = [];
            graph_data['satellites'] = [];
            graph_data['temperature'] = [];
            graph_data['battery'] = [];

            $.each(docs, function(index, val) {
                var position = new google.maps.LatLng(getField(val['doc'], 'latitude'), getField(val['doc'], 'longitude'));

                if (index > pointsStart - 1) {
                    var marker = new google.maps.Marker({
                        position: position,
                        map: map,
                        title: getField(val['doc'], 'datetime', true),
                        icon: index != docs.length - 1 ? regularIcon : lastIcon
                    });

                    google.maps.event.addListener(marker, 'click', function() {
                        infoWindow.close();
                        infoWindow.setContent(makeDescription(val['doc']));
                        infoWindow.open(map, marker);
                    });

                    google.maps.event.addListener(marker, 'mouseover', function() {
                        marker.setIcon(index != docs.length - 1 ? regularIconHover : lastIcon);
                    });

                    google.maps.event.addListener(marker, 'mouseout', function() {
                        marker.setIcon(index != docs.length - 1 ? regularIcon : lastIcon);
                    });

                    map_markers.push(marker);
                }

                var temp = getField(val['doc'], 'temperature');
                if (temp < minTemp) minTemp = temp;
                if (temp > maxTemp) maxTemp = temp;

                if (index != 0) {
                    var pos1 = getField(docs[index - 1]['doc'], 'position');
                    var pos2 = getField(val['doc'], 'position');
                    totalDistance += distanceBetween(pos1, pos2);
                }

                if (val['doc']['data']['_parsed']['configuration_sentence_index'] == 1) {
                    var id = val['doc']['_id'];
                    var text = getField(val['doc'], 'datetime_compact', true);
                    $('#imu-panel ul').append('<li><a href="http://track.poseidon.sgsphysics.co.uk/imu.php?transmission=' + id + '" target="_blank" class="btn btn-block btn-info">' + text + '</a></li>');
                }

                var timestamp = getField(val['doc'], 'datetime').valueOf()
                graph_data['altitude'].push([timestamp, getField(val['doc'], 'altitude')]);
                graph_data['satellites'].push([timestamp, getField(val['doc'], 'satellites')]);
                graph_data['temperature'].push([timestamp, getField(val['doc'], 'temperature')]);
                graph_data['battery'].push([timestamp, getField(val['doc'], 'battery')]);
            });

            var duration = moment().utc().diff(getField(first, 'datetime'));
            $('#stats-duration').html(format('milliseconds', duration));
            $('#stats-distance').html(round(totalDistance, 2) + "km");
            $('#stats-min-temperature').html(format('temperature', minTemp));
            $('#stats-max-temperature').html(format('temperature', maxTemp));

            plot(current_graph);

            if (nextTransmissionTime < 150000) {
                setTimeout(update, 15000);
            } else {
                setTimeout(update, 60000);
            }

            $('#updated').html("Last updated at " + moment().format('HH:mm:ss'));
        });
    }

    update();
}); });
