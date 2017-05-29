(function() {
  var map = new L.Map('map', {
    zoomControl: false
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
  	var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  	var osmAttrib='Map data © <a href="http://openstreetmap.org">OSM</a>';
  	var osm = new L.TileLayer(osmUrl, {minZoom: 8, maxZoom: 18, attribution: osmAttrib});

  	map.setView(new L.LatLng(30.2793421,-97.7395106),9);
  	map.addLayer(osm);
    var marker = new L.Marker([30.2793421,-97.7395106], {
      title: "Adam's in the Stephen F. Austin building"
    }).addTo(map);

    //find the user's lcoation and add it to the map
    //currently disabled as per SSL requirements
    // var find = map.locate();

    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);
  }

  initializeMap();
}).call(this);
