# MBTA BUS TRACKER

This [web app](http://www.alotish.com/bustracker) is used for real-time tracking of MBTA buses.  It uses the MBTA [V3 API](https://mbta.com/developers/v3-api) to obtain tracking data and [OpenLayers](https://openlayers.org/) to display information on a map.

Any tracked bus route on the MBTA may be selected.  A map is shown will all active buses in both directions.  The interface allows selection of one direction so only buses in that direction will be tracked.

Clicking on any stop on the route will present arrival predictions if available.  Some stops are used by buses traveling in each direction but most are for a single direction.  Arrival predictions will be shown for both directions if appropriate unless a single direction is selected for tracking.

Clicking a bus icon shows the latest status reported by the bus.  Buses send out a heartbeat once per minute, so the reported status may not exactly match the current location of the bus.

