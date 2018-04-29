
/*
 *  Create and update map using OpenLayers
 *
 */  
   
  
    // bus marker styles, indexed by direction
    var busMarkerStyles=[];

    var markerStyleCircle = new ol.style.Style({
        image: new ol.style.Circle ({
          radius: 5,
          stroke: new ol.style.Stroke({
           color: '#00ff00',
           width: 1
          }),
          fill: new ol.style.Fill({
           color: '#ff0000'
          })
        })
      });
 
 
    var map;              // openlayers map
    var getPredictions;   // function passed in, makes API calls for arrival prediction
 
    // style for lines
    var lineStyle = new ol.style.Style({
       fill : new ol.style.Fill({color: [100, 100, 100, 0.5]}),
       stroke : new ol.style.Stroke({color : 'rgba(50,50,100,0.75)', width : 5}),
     }); 
    
    // layer for stops and routes
    var vectorLayer;      

     // overlay for popups
    var popupOverlay = null;
    
    // layer for stop popup
    var stopPopupOverlay = null;
    
    // layer for vehicles
    var vehicleLayer = new ol.layer.Vector();
    
    // set empty source
    vehicleLayer.setSource(new ol.source.Vector());   

     // return style based on feature type
     function getStyle(featType) {
      
      var retVal;
      
      if( featType === 'site' )
      {
        retVal = markerStyleBlue;
        
      } else {
        
        retVal = markerStyleRed;
      }
      
      return retVal;
     }
 
 
    // format popup for stop information
    function formatStopPopup(stop)
    {
        
      var htmlStr = "";
      
      // close button
      htmlStr = "<div><button type=\"button\" onClick=\"clearStopPopups();\" class=\"close\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button></div>";
 
 
      // stop name
      htmlStr += "<div class='text-center name'><p>"+stop.attributes.name+"</p></div>";
      
      return(htmlStr);        
     // return("<div class='stop-popup'<p>Stop</p><p class=\"name\">"+stop.attributes.name+"</p><div>");
    }
 
    // format popup for vehicle information
    function formatVehiclePopup(vehicle)
    {
             
      return("<div class='bus-popup'<p>Bus</p><p class=\"name\">"+vehicle.attributes.label+"</p></div>");
    }
    
    
   buildMap = function(shapes, stops,  markerFiles, predictionFetcher) {
                
      var mapFeatures = [];      // all features on layer
        
        // save callback
        getPredictions = predictionFetcher;
        
       // create marker styles for busses, one for each direction
        busMarkerStyles.push(new ol.style.Style({
                  image: new ol.style.Icon ({
                  anchor: [0.5, 0.96],
                  src: markerFiles[0],
                  width: 31,
                  height: 35
             })
          }));
        
         busMarkerStyles.push(new ol.style.Style({
                  image: new ol.style.Icon ({
                  anchor: [0.5, 0.96],
                  src: markerFiles[1],
                  width: 31,
                  height: 35
             })
          })); 

        //**** Lines for Route (one for each direction) ****
        var linePoints;
        
        // build lines for route with transformed latlons
        shapes.forEach(function(shape) {
                            
           linePoints = []; 
           shape.forEach(function(linept) { 
                linePoints.push(ol.proj.transform([linept.lon, linept.lat], 'EPSG:4326', 'EPSG:3857'));
            });
           
            // create line from points
            var featureLine = new ol.Feature({
              geometry: new ol.geom.LineString(linePoints)
           });
        
            // set style for line
            featureLine.setStyle(lineStyle);
 
            // add line to map
            mapFeatures.push(featureLine);          
           // console.log(linePoints.length);

        });
        
 
       //**** Markers for Stops ****
 
       // for each stop
       stops.forEach(function(stop) { 
        
        // create a feature for this stop
        var iconFeature = new ol.Feature({
          geometry : new ol.geom.Point(ol.proj.transform([stop.attributes.longitude, stop.attributes.latitude], 'EPSG:4326', 'EPSG:3857')),
          description: formatStopPopup(stop),
          stopID: stop.id
          
        });
   
        // set style for stop marker
        iconFeature.setStyle(markerStyleCircle);
              
        // add to list of features for layer
        mapFeatures.push(iconFeature);
        
      });
   
  
      // create base layer for map
      var mapBaseLayer = new ol.layer.Tile({
          source: new ol.source.OSM()
      });
      
       
      // create vector layer for route and stops
      vectorLayer = new ol.layer.Vector({
            source: new ol.source.Vector({features: mapFeatures})
          });
      
     // use middle point for map center
     var mapCenter = shapes[0][Math.round(shapes[0].length/2)];
     
     // clear old map if necessary
     document.getElementById('map').innerHTML = "";
     
      // create map
      map = new ol.Map({       
        layers: [ mapBaseLayer, vectorLayer, vehicleLayer],
        target: document.getElementById('map'),
        view: new ol.View({
          center: ol.proj.fromLonLat([mapCenter.lon,mapCenter.lat]),
          zoom: 13
        })
      });
      
       // set click handler for map
      map.on('click', function(evt) {
          var feature = map.forEachFeatureAtPixel(evt.pixel,
              function(feature) {
                return feature;
              });
   
          // if a point was clicked
          if ( feature && (feature.getGeometry().getType() === 'Point') ) {
  
            // if a stop icon was clicked
            if( feature.getProperties().stopID != undefined )
            {
                // show a popup
                stopClick(feature);
    
            } else {
              
              // read cooridnates from feature
              var coordinates = feature.getGeometry().getCoordinates();
              
              // build popup element
              var e = document.createElement('div');
              e.className = 'vehicle-popup';
              e.innerHTML = feature.getProperties().description;
          //    e.appendChild(feature.getProperties().description);
                    
              // create new popup if necessary
              if( popupOverlay === null ) popupOverlay = new ol.Overlay({autoPan: true});
              
              // add new div to overlay
              popupOverlay.setElement(e);
              
              // add overlay to map
             popupOverlay.setPosition(coordinates);
             map.addOverlay(popupOverlay);
         
            } // else
 
          } else {
  
             // clear any vehicle popups
             clearVehiclePopups();
             
            
          } // else
          
        });
    };

    // stopClick
    //
    // A stop icon has been clicked, show popup
    //
    function stopClick(feature)
    {
        
            // read cooridnates from feature
            var coordinates = feature.getGeometry().getCoordinates();
            
            // build popup element
            var e = document.createElement('div');
            e.id = 'stoppopup';
            e.stopID = feature.getProperties().stopID;
            e.className = 'stop-popup';
            e.innerHTML = feature.getProperties().description;
                  
            // create new popup if necessary
            if( stopPopupOverlay === null ) stopPopupOverlay = new ol.Overlay({autoPan: true});
            
    
            // add new div to overlay
            stopPopupOverlay.setElement(e);
            
            // add predictions to popup
            getPredictions(e);
            
            // add overlay to map
            stopPopupOverlay.setPosition(coordinates);
            map.addOverlay(stopPopupOverlay);     
        
    }

    // call to place vehicles on map
    function updateVehiclePositions(vehicles) {
        
        // console.log("update " + new Date().getTime());
        
        // clear any popups
        clearVehiclePopups();
        
        // begin with emapty list
        // vehicles already on the list will
        // have their location updated, newly seen vehicles will be
        // added and vehicles no longer seen will be left off
        var mapFeatures = [];  
  
        // get vehicle layer source
        var source = vehicleLayer.getSource();
        
        // get features on source
        var vFeatures = source.getFeatures();
        
          //   console.log(vehicles);
             
            // for each vehicle
            vehicles.forEach(function(vehicle) {
             
                // true => vehicle found on layer
                var foundVehicle = Boolean(false);
                
                // look at current features
                for(var i=0; i < vFeatures.length; i++)
                {
                    // if this vehicle is alredy on it
                    if( vFeatures[i].getProperties().description == vehicle.attributes.label )
                    {
                        // update position
                      //  console.log("found " + vehicle.attributes.label);
                      //  console.log(vFeatures[i].getGeometry().getCoordinates());

                        // set new posiiton
                        vFeatures[i].setGeometry(new ol.geom.Point(ol.proj.transform([vehicle.attributes.longitude, vehicle.attributes.latitude], 'EPSG:4326', 'EPSG:3857')));
                     //   console.log(vFeatures[i].getGeometry().getCoordinates());
 
                        // set style - may have changed direction
                        vFeatures[i].setStyle(busMarkerStyles[vehicle.attributes.direction_id]);

                        // add to new features list
                        mapFeatures.push(vFeatures[i]);
                        
                        // set flag
                        foundVehicle = true;
                        
                        break;
                        
                    } // if
                    
                } // for
             
                // if vehicle was not already on layer
                if( foundVehicle === false )
                {
         //           console.log("******* ADDED VEHICLE " + vehicle.attributes.label + " *******");
                    
                    // create a feature for this vehicle
                    var iconFeature = new ol.Feature({
                      geometry : new ol.geom.Point(ol.proj.transform([vehicle.attributes.longitude, vehicle.attributes.latitude], 'EPSG:4326', 'EPSG:3857')),
                      description: vehicle.desc
                    });
           
                    // set style for this marker
                    iconFeature.setStyle(busMarkerStyles[vehicle.attributes.direction_id]);
                   
                    // add to list of features for layer
                    mapFeatures.push(iconFeature);
                 
                } // if
                    
            });
            
            // set source for vehcleLayer
            vehicleLayer.setSource(new ol.source.Vector({features: mapFeatures}));
      
        // if there is a stop popup, update predections
        if( stopPopupOverlay != null )
        {
                           
          //  console.log(stopPopupOverlay.getFeatures());
            getPredictions(document.getElementById('stoppopup'));
            
        } // if
        
    }


    // clearStopPopups
    //
    // Celar any stop popups from screen
    //
    function clearStopPopups()
    {
        // if there is a stop pop up
      if( stopPopupOverlay !== null )
      {
        // remove overlay from map
        map.removeOverlay(stopPopupOverlay);
        
        // done with this pop up
        stopPopupOverlay = null;
        
      } // if
      
    }
    
     // clearStopPopups
    //
    // Celar any vihicle popups from screen
    //
    function clearVehiclePopups()
    {
      // if there is a pop up
      if( popupOverlay !== null )
      {
        // remove overlay from map
        map.removeOverlay(popupOverlay);
        
        // done with this pop up
        popupOverlay = null;
        
      } // if
      
    }   

    // unselect all features
    function clearPopups() {
        
      // if there is a pop up
      if( popupOverlay !== null )
      {
        // remove overlay from map
        map.removeOverlay(popupOverlay);
        
        // done with this pop up
        popupOverlay = null;
        
      } // if
                
       // if there is a stop pop up
      if( stopPopupOverlay !== null )
      {
        // remove overlay from map
        map.removeOverlay(stopPopupOverlay);
        
        // done with this pop up
        stopPopupOverlay = null;
        
      } // if      

    };
    
              