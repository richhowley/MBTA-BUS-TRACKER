   
// decode
//
// Converts points using the Google encoded polyline algorithm
//   https://developers.google.com/maps/documentation/utilities/polylinealgorithm
//
// This code was acquired from a blog post on a now defunct blog.
 // 
function decode(encoded){

    // array that holds the points

    var points=[ ]
    var index = 0, len = encoded.length;
    var lat = 0, lng = 0;
    while (index < len) {
        var b, shift = 0, result = 0;
        do {

    b = encoded.charAt(index++).charCodeAt(0) - 63;//finds ascii                                                                                    //and substract it by 63
              result |= (b & 0x1f) << shift;
              shift += 5;
             } while (b >= 0x20);


       var dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
       lat += dlat;
      shift = 0;
      result = 0;
     do {
        b = encoded.charAt(index++).charCodeAt(0) - 63;
        result |= (b & 0x1f) << shift;
       shift += 5;
         } while (b >= 0x20);
     var dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
     lng += dlng;
 
   points.push({lat:( lat / 1E5),lon:( lng / 1E5)})  
 
  }

  return points
}   
    