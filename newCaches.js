/*     New Caches

Aluno 1: ?number ?name <-- mandatory to fill
Aluno 2: ?number ?name <-- mandatory to fill

Comment:

The file "newCaches.js" must include, in the first lines,
an opening comment containing: the name and number of the two students who
developd the project; indication of which parts of the work
made and which were not made; possibly alerts to some aspects of the
implementation that may be less obvious to the teacher.



0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789

HTML DOM documentation: https://www.w3schools.com/js/js_htmldom.asp
Leaflet documentation: https://leafletjs.com/reference.html
*/



/* GLOBAL CONSTANTS */

const MAP_INITIAL_CENTRE =
	[38.661,-9.2044];  // FCT coordinates
const MAP_INITIAL_ZOOM =
	14
const MAP_ID =
	"mapid";
const MAP_ATTRIBUTION =
	'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> '
	+ 'contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>';
const MAP_URL =
	'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token='
	+ 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'
const MAP_ERROR =
	"https://upload.wikimedia.org/wikipedia/commons/e/e0/SNice.svg";
const MAP_LAYERS =
	["streets-v11", "outdoors-v11", "light-v10", "dark-v10", "satellite-v9",
		"satellite-streets-v11", "navigation-day-v1", "navigation-night-v1"]
//const RESOURCES_DIR =
//	"http//ctp.di.fct.unl.pt/lei/lap/projs/proj2122-3/resources/";
const RESOURCES_DIR =
 	"resources/";
const CACHE_KINDS = ["CITO", "Earthcache", "Event",
	"Letterbox", "Mega", "Multi", "Mystery", "Other",
	"Traditional", "Virtual", "Webcam", "Wherigo"];
const CACHE_RADIUS =
	161	// meters
const MAX_CACHE_DISTANCE =
	400 //meters
const CACHES_FILE_NAME =
	"caches.xml";
const STATUS_ENABLED =
	"E"


/* GLOBAL VARIABLES */

let map = null;



/* USEFUL FUNCTIONS */

// Capitalize the first letter of a string.
function capitalize(str)
{
	return str.length > 0
			? str[0].toUpperCase() + str.slice(1)
			: str;
}

// Distance in km between to pairs of coordinates over the earth's surface.
// https://en.wikipedia.org/wiki/Haversine_formula
function haversine(lat1, lon1, lat2, lon2)
{
    function toRad(deg) { return deg * 3.1415926535898 / 180.0; }
    let dLat = toRad(lat2 - lat1), dLon = toRad (lon2 - lon1);
    let sa = Math.sin(dLat / 2.0), so = Math.sin(dLon / 2.0);
    let a = sa * sa + so * so * Math.cos(toRad(lat1)) * Math.cos(toRad(lat2));
    return 6372.8 * 2.0 * Math.asin (Math.sqrt(a));
}

function loadXMLDoc(filename)
{
	let xhttp = new XMLHttpRequest();
	xhttp.open("GET", filename, false);
	try {
		xhttp.send();
	}
	catch(err) {
		alert("Could not access the geocaching database via AJAX.\n"
			+ "Therefore, no POIs will be visible.\n");
	}
	return xhttp.responseXML;	
}

function getAllValuesByTagName(xml, name)  {
	return xml.getElementsByTagName(name);
}

function getFirstValueByTagName(xml, name)  {
	return getAllValuesByTagName(xml, name)[0].childNodes[0].nodeValue;
}

function kindIsPhysical(kind) {
	return kind === "Traditional";
}

function txt2xml(txt) {
    let parser = new DOMParser();
    return parser.parseFromString(txt,"text/xml");
}


/* POI CLASS + Cache CLASS */

class POI {
	constructor(xml) {
		this.decodeXML(xml);
	}

	decodeXML(xml) {
		if(xml === null)
			return;
		this.name = getFirstValueByTagName(xml, "name");
		this.latitude = getFirstValueByTagName(xml, "latitude");
		this.longitude = getFirstValueByTagName(xml, "longitude");
	}

	installCircle(radius, color) {
		let pos = [this.latitude, this.longitude];
		let style = {color: color, fillColor: color, weight: 1, fillOpacity: 0.1};
		this.circle = L.circle(pos, radius, style);
		this.circle.bindTooltip(this.name);
		map.add(this.circle);	
	}
}

class Cache extends POI {
	constructor(xml) {
		super(xml);
		this.installMarker();
	}

	decodeXML(xml) {
		super.decodeXML(xml);
		this.code = getFirstValueByTagName(xml, "code");
		this.owner = getFirstValueByTagName(xml, "owner");
		this.altitude = getFirstValueByTagName(xml, "altitude");

		this.kind = getFirstValueByTagName(xml, "kind");
		this.size = getFirstValueByTagName(xml, "size");
		this.difficulty = getFirstValueByTagName(xml, "difficulty");
		this.terrain = getFirstValueByTagName(xml, "terrain");


		this.favorites = getFirstValueByTagName(xml, "favorites");
		this.founds = getFirstValueByTagName(xml, "founds");
		this.not_founds = getFirstValueByTagName(xml, "not_founds");
		this.state = getFirstValueByTagName(xml, "state");
		this.county = getFirstValueByTagName(xml, "county");

		this.publish = new Date(getFirstValueByTagName(xml, "publish"));
		this.status = getFirstValueByTagName(xml, "status");
		this.last_log = new Date(getFirstValueByTagName(xml, "last_log"));
	}

	installMarker() {
		let pos = [this.latitude, this.longitude];
		this.marker = L.marker(pos, {icon: map.getIcon(this.kind)});
		this.marker.bindTooltip(this.name);
		this.marker.bindPopup("I'm the marker of the cache <b>" + this.name + "</b>.");
		map.add(this.marker);
	}
}


class AddedCache extends Cache {
	constructor(lat, lng) {
		let txt =
          `<cache>
            <code>UNKNOWN</code>
            <name>UNKNOWN</name>
            <owner>UNKNOWN</owner>
            <latitude>${lat}</latitude>
            <longitude>${lng}</longitude>
            <altitude>-32768</altitude>
            <kind>Traditional</kind>
            <size>UNKNOWN</size>
            <difficulty>1</difficulty>
            <terrain>1</terrain>
            <favorites>0</favorites>
            <founds>0</founds>
            <not_founds>0</not_founds>
            <state>UNKNOWN</state>
            <county>UNKNOWN</county>
            <publish>2000/01/01</publish>
            <status>E</status>
            <last_log>2000/01/01</last_log>
          </cache>`;
        let xml = txt2xml(txt);
		super(xml)
	}
}

class Place extends POI {
	constructor(name, pos) {
		super(null);
		this.name = name;
		this.latitude = pos[0];
		this.longitude = pos[1];
		this.installCircle(CACHE_RADIUS, 'black');
	}
}

/* Map CLASS */

class Map {
	constructor(center, zoom) {
		this.lmap = L.map(MAP_ID).setView(center, zoom);
		this.addBaseLayers(MAP_LAYERS);
		this.icons = this.loadIcons(RESOURCES_DIR);
		this.caches = [];
		this.addClickHandler(e =>
			L.popup()
			.setLatLng(e.latlng) 
			.setContent(`
				<p>You clicked the map at  + ${e.latlng.toString()}</p>
				<a href=" http://maps.google.com/maps?layer=c&cbll=${e.latlng.lat}, ${e.latlng.lng}" target="_blank">
    			<button>Street View</button>
  				</a>

				<button onClick="addCache(${e.latlng.lat}, ${e.latlng.lng})">New Cache</button>
				
		`)
		);
		
	}
	

	populate() {
		this.caches = this.loadCaches(RESOURCES_DIR + CACHES_FILE_NAME);
	}

	showFCT() {
		this.fct = new Place("FCT/UNL", MAP_INITIAL_CENTRE);
	}

	getIcon(kind) {
		return this.icons[kind];
	}

	getCaches() {
		return this.caches;
	}

	makeMapLayer(name, spec) {
		let urlTemplate = MAP_URL;
		let attr = MAP_ATTRIBUTION;
		let errorTileUrl = MAP_ERROR;
		let layer =
			L.tileLayer(urlTemplate, {
					minZoom: 6,
					maxZoom: 19,
					errorTileUrl: errorTileUrl,
					id: spec,
					tileSize: 512,
					zoomOffset: -1,
					attribution: attr
			});
		return layer;
	}

	addBaseLayers(specs) {
		let baseMaps = [];
		for(let i in specs)
			baseMaps[capitalize(specs[i])] =
				this.makeMapLayer(specs[i], "mapbox/" + specs[i]);
		baseMaps[capitalize(specs[0])].addTo(this.lmap);
		L.control.scale({maxWidth: 150, metric: true, imperial: false})
									.setPosition("topleft").addTo(this.lmap);
		L.control.layers(baseMaps, {}).setPosition("topleft").addTo(this.lmap);
		return baseMaps;
	}

	loadIcons(dir) {
		let icons = [];
		let iconOptions = {
			iconUrl: "??",
			shadowUrl: "??",
			iconSize: [16, 16],
			shadowSize: [16, 16],
			iconAnchor: [8, 8], // marker's location
			shadowAnchor: [8, 8],
			popupAnchor: [0, -6] // offset the determines where the popup should open
		};
		for(let i = 0 ; i < CACHE_KINDS.length ; i++) {
			iconOptions.iconUrl = dir + CACHE_KINDS[i] + ".png";
			iconOptions.shadowUrl = dir + "Alive.png";
			icons[CACHE_KINDS[i]] = L.icon(iconOptions);
			iconOptions.shadowUrl = dir + "Archived.png";
			icons[CACHE_KINDS[i] + "_archived"] = L.icon(iconOptions);
		}
		return icons;
	}

	loadCaches(filename) {
		let xmlDoc = loadXMLDoc(filename);
		let xs = getAllValuesByTagName(xmlDoc, "cache"); 
		let caches = [];
		if(xs.length === 0)
			alert("Empty cache file");
		else {
			for(let i = 0 ; i < xs.length ; i++)  // Ignore the disabled caches
				if( getFirstValueByTagName(xs[i], "status") === STATUS_ENABLED )
					caches.push(new Cache(xs[i]));
		}
		return caches;
	}

	addCache(cache) {
		this.caches.push(cache);
	}

	add(marker) {
		marker.addTo(map.lmap);
	}

	remove(marker) {
		marker.remove();
	}

	addClickHandler(handler) {
		let m = this.lmap;
		function handler2(e) {
			return handler(e).openOn(m);
		}
		return this.lmap.on('click', handler2);
	}

	validateLocation(lat, lng) {
		let minimumDistance = Number.POSITIVE_INFINITY;

		this.caches.forEach(cache => {
			const distance = haversine(cache.latitude, cache.longitude, lat, lng) * 1000;//km to m
			if (distance < minimumDistance) {
				minimumDistance = distance;
			}
		})

		if (minimumDistance < CACHE_RADIUS) {
			return {error: `Cache is too close: ${minimumDistance.toFixed(1)}m to nearest cache, minimum is ${CACHE_RADIUS}m`}
		}

		if (minimumDistance > MAX_CACHE_DISTANCE) {
			return {error: `Cache is too far: ${minimumDistance.toFixed(1)}m to nearest cache, maximum is ${MAX_CACHE_DISTANCE}m`}
		}

		return true;
	}
}


/* Some FUNCTIONS are conveniently placed here to be directly called from HTML.
   These functions must invoke operations defined in the classes, because
   this program must be written using the object-oriented style.
*/

function onLoad()
{
	map = new Map(MAP_INITIAL_CENTRE, MAP_INITIAL_ZOOM);
	map.showFCT();
	map.populate();
}

function addCache(lat, lng) {
	const locationValidity = map.validateLocation(lat, lng);
	if (locationValidity.error) {
		alert(locationValidity.error)
	} else {
		map.addCache(new AddedCache(lat, lng))
	}
}

