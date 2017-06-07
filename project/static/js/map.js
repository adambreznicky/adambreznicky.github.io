(function() {
  var map = new L.Map('map', {
    // dragging: !L.Browser.mobile,
    touchZoom: true,
    tap: true
  });

  function onLocationFound(e) {
    var marker = new L.Marker(e.latlng, {
      title: "You",
      icon: L.icon({
        iconUrl: "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
        iconAnchor: [12, 41]
      })
    }).addTo(map);
  }

  function onLocationError(e) {
    console.log(e);
  }

  function initializeMap () {
    var layer = new L.StamenTileLayer("watercolor");

  	map.setView(new L.LatLng(30.2793421,-97.7395106),11);
  	map.addLayer(layer);
    var marker = new L.Marker([30.2793421,-97.7395106], {
      title: "TNRIS is in Stephen F. Austin building"
    }).addTo(map);
    marker.bindPopup("TNRIS is in the Stephen F. Austin building.").openPopup();

    //find the user's lcoation and add it to the map
    //currently disabled as per SSL requirements
    // var find = map.locate();

    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);
  }

  initializeMap();
}).call(this);
