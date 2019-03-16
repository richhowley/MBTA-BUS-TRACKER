 /*
  * Angular controller that handles
  * route selection and all MBTA API calls.
  *
  */ 
 
 (function() {
     
   var app = angular.module('bustracker',[]);
 
   app.controller('BusController',
         ['$rootScope','$scope', '$http', '$interval', '$filter',function($rootScope,$scope,$http,$interval, $filter)
   {

      this.allRoutes = [];          // list of all routes - used for UI
      this.directionNames=[];       // usually inboud and outbound, contained in route data
      this.directionDest=[];         // destination for each direction
      this.stops = []               // name of each stop on a route
      this.shapes = [];             // polylines for shapes in each direction
      
      //  Maps Icons Collection   https://mapicons.mapsmarker.com/markers/transportation/road-transportation/bus/
      this.markerFiles = ['icons/busyellow.png','icons/busblue.png'];
      this.directionFilter = (-1);  // -1 for both directions. 0 or 1 to limit API calls to one direction 
      this.route = null;            // currently selected route
      this.intervalPromise;         // used when updating vehicle positions
      this.maxPred = 3;             // max # of arrival predictions listed for stop
      var _this = this;
      
      // read routes
      $http.get("https://api-v3.mbta.com/routes?filter[type]=3&sort=sort_order&api_key="
                +my_api_key).then(function(response) {
       
         _this.allRoutes = response.data.data;
         
        // routes not tracked by GPS are at end of array and their
        // ids are > 700
        
        // reverse the list
         _this.allRoutes.reverse();
         
         // look at each element
         for(var i=0; i < _this.allRoutes.length; i++)
         {
            // if first element is for bus that is not tracked
            if( _this.allRoutes[0].id >= 700 )
            {
               
               // remove it
                _this.allRoutes.shift();
               
            } else {
               
               // stop looking
               break;
            
            } // else
            
            
         } // for

         // restore list order
         _this.allRoutes.reverse();           
         
         
                       
      });
        
      // a route has been selected
      this.setRoute = function(idx) {
         
            // get id from array
            this.route = this.allRoutes[idx].id;
            
          
            // get route information - direction name indicies are in vehicle information
           $http.get("https://api-v3.mbta.com/routes/"+_this.route+"?api_key="+my_api_key).then(function(response) {
   
               // record direction names
               _this.directionNames = response.data.data.attributes.direction_names;
               
               // record direction destinaitons
               _this.directionDest = response.data.data.attributes.direction_destinations;
   
               // use short name for route name
               _this.routeName = response.data.data.attributes.short_name;
               
               // get route shape and stop information
               $http.get("https://api-v3.mbta.com/shapes?api_key="+my_api_key+"&include=stops&filter[route]="
                        +_this.route).then(function(response, status) {
            
               // clear shpaes array
               _this.shapes = [];
       
               // process all shapes
               response.data.data.forEach(function(shape) {
               
                  // decode route and add to array
                  _this.shapes.push(decode(String(shape.attributes.polyline)));
               });
                         
               // set array of vehicle stop information
               _this.stops = response.data.included;
           
         
               // build map of route and stops
               buildMap(_this.shapes,_this.stops, _this.markerFiles, _this.getPredictions);      
               
               // update vehicle positions on map
               _this.getVehicles();
               
                    intervalPromise = $interval(function() {
                     _this.getVehicles();
                 
                   }, 30000);        
            
            });
   
               
         });        
      
      };
 
      // buildPredList
      //
      // Use the passed predictions to format arrival times in HTML
      //
      this.buildPredList = function(predList,dirID, listElem) {
         
         var node;
         var listSize = predList.length;
         var retVal = 0;
 
         // for each prediction
         for(i=0; ((i < listSize) && (retVal < this.maxPred)); i++)
         {
            
            // skip if not in desired direction or arrival is null
            if( (predList[i].attributes.direction_id != dirID)
                  || (predList[i].attributes.arrival_time === null) ) continue;
            
              
            // build list item
            node = document.createElement("LI");
            node.className = "list-group-item";
            node.appendChild(document.createTextNode(moment(predList[i].attributes.arrival_time).fromNow()));
              
            // add list item    
            listElem.appendChild(node);
            
            // increment count
            retVal++;
            
         } // for
         
         return(retVal);
         
      }
 
       
      
   // getPredictions
   //
   // Add predictions to passed popup
   //
   this.getPredictions = function(elem)
   {
      
        var reqStr = "https://api-v3.mbta.com//predictions?sort=arrival_time,direction_id&filter[stop]="+elem.stopID+"&filter[route]="+_this.route;
                           
 
      // filter for direction if desired
      if( _this.directionFilter >= 0)
      {
         reqStr += "&filter[direction_id]="+_this.directionFilter;
           
      } // if     
      
      // api call for arrival predictions
      $.get(reqStr,function(data, status) {

                
            var dirs = _this.directionNames.length;
            
            // make a div for the predictions
            var predDiv;
            
            // for each direction
            for( vDirection=0; vDirection < dirs; vDirection++ )
            {
            
               // find existing list, if there is one
               predDiv = document.getElementById('predictions' + '-' + _this.directionNames[vDirection]);
               
               // nuke any old predictinos
               if( predDiv != null)
               {
                  elem.removeChild(predDiv);
                  
               } // if
               
            } // for
            
            // get list of predictions
            var predList = data.data;
            
            // if any predictions for this stop
            if( predList.length > 0 )
            {
  
                  
                  // for each direction
                  for( vDirection=0; vDirection < dirs; vDirection++ )
                  {
  
                     // may only wont predictions in one direction
                     if( (_this.directionFilter >= 0) && (vDirection != _this.directionFilter) ) continue;
  
                     // craate list
                     var listElem = document.createElement("UL");
                     listElem.className = 'list-group';
                     
                     // build list of predictions
                     var listLength = _this.buildPredList(predList,vDirection, listElem);
                     
                     // if any predictions
                     if( listLength > 0 )
                     {
                        // div
                        predDiv = document.createElement("div");
                        predDiv.id = 'predictions' + '-' + _this.directionNames[vDirection];
                        predDiv.className = "predictions text-center";
                        
                        // direction
                        var para = document.createElement("p");
                        para.appendChild(document.createTextNode(_this.routeName + "  " +_this.directionNames[vDirection]));
                        predDiv.appendChild(para);
                        
                        predDiv.appendChild(listElem);
                        
                        // add list to popup
                        elem.appendChild(predDiv);
                     
                     } // if
                  
                  } // for
               
            } // if
     

      });     
      
     
    }
      
   // getVehicles
   //
   // Call frequently to update vehicle postions on map
   //
   this.getVehicles = function ()
   {
      
        var reqStr = "https://api-v3.mbta.com/vehicles?api_key"+my_api_key+"&filter[route]="
                           +_this.route+"&include=stop";
 
        // filter for direction if desired
        if( _this.directionFilter >= 0)
        {
           reqStr += "&filter[direction_id]="+_this.directionFilter;
           
        } // if
            
         // get all vehicles on route
         $http.get(reqStr).then(function(response,status) {
            
            var vehicles = response.data.data;
        
            // set descrition for popup
            
            // for each vehicle
            vehicles.forEach(function(vehicle) {
               
               // get stop name
               var sname = vehicle.relationships.stop.data === null ? null :
                 _this.stops.find(function(s) { return(s.id===vehicle.relationships.stop.data.id) });
                    
               // div for vehicle popup
               vehicle.desc  = "<div>";
               
               // vehicle id
               vehicle.desc += "<p class='text-center vehicle-popup-label'>Route "+_this.routeName+"<br>Bus "+vehicle.attributes.label+"</p>";
               
               // vehicle direction
               vehicle.desc  += "<p class='vehicle-popup-direction'>Direction:  "+_this.directionNames[vehicle.attributes.direction_id]+"</p>";
               
               // show status if we got a good stop name
               if( sname !== undefined && sname !== null )
               {
                  vehicle.desc += "<p class='vehicle-popup-status-label'>Last Status:</p>";
                  vehicle.desc +=  "<p class='ml-1 vehicle-popup-status'>"+vehicle.attributes.current_status+"<br>";
                  vehicle.desc +=  sname.attributes.name+"</p>";
                
               } // if
               
               vehicle.desc += "</div>"

            });
            
             // draw markers on map
             updateVehiclePositions(vehicles);
            
         });
        
    }     
           
      // deselect route
      this.clearRoute = function() {
         
         // stop interval
         $interval.cancel(intervalPromise);
         
         // clear route id
         this.route = null;
         
         this.directionFilter = (-1);

      };
      
    }]);
     
     
 })();
 
 


