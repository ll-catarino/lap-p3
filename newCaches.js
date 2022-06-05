/*     New Caches

Aluno 1: 55100 Lourenco Catarino
Aluno 2: 60774 Goncalo Gomes

Comment:

Implemented features:
	All features implemented



/*
 The generation of as many caches as possible is done by the function, defined in the Map 
class, named manyNewRandomCaches().
 This function works by iterating through the existing list of caches and then attempting 
to create a new cahce around that "original one" 10 times.
 The function counts how many caches were placed and the value is then anounced when 
the function finishes generating new caches.

More detailed description is available next to the function itself



0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789

HTML DOM documentation: https://www.w3schools.com/js/js_htmldom.asp
Leaflet documentation: https://leafletjs.com/reference.html
*/



/* GLOBAL CONSTANTS */

const MAP_INITIAL_CENTRE =
	[38.661, -9.2044];  // FCT coordinates
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
	["dark-v10", "streets-v11", "outdoors-v11", "light-v10", "satellite-v9",
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
const UNKNOWN_ALTITUDE =
	-32768;


/* GLOBAL VARIABLES */

let map = null;



/* USEFUL FUNCTIONS */

// Capitalize the first letter of a string.
function capitalize(str) {
	return str.length > 0
		? str[0].toUpperCase() + str.slice(1)
		: str;
}

// Distance in km between to pairs of coordinates over the earth's surface.
// https://en.wikipedia.org/wiki/Haversine_formula
function haversine(lat1, lon1, lat2, lon2) {
	function toRad(deg) { return deg * 3.1415926535898 / 180.0; }
	let dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
	let sa = Math.sin(dLat / 2.0), so = Math.sin(dLon / 2.0);
	let a = sa * sa + so * so * Math.cos(toRad(lat1)) * Math.cos(toRad(lat2));
	return 6372.8 * 2.0 * Math.asin(Math.sqrt(a));
}

function loadXMLDoc(filename) {
	let xhttp = new XMLHttpRequest();
	xhttp.open("GET", filename, false);
	try {
		xhttp.send();
	}
	catch (err) {
		alert("Could not access the geocaching database via AJAX.\n"
			+ "Therefore, no POIs will be visible.\n");
	}
	return xhttp.responseXML;
}

function getAllValuesByTagName(xml, name) {
	return xml.getElementsByTagName(name);
}

function getFirstValueByTagName(xml, name) {
	return getAllValuesByTagName(xml, name)[0].childNodes[0].nodeValue;
}

function kindIsPhysical(kind) {
	return kind === "Traditional";
}

function txt2xml(txt) {
	let parser = new DOMParser();
	return parser.parseFromString(txt, "text/xml");
}

function generateCSS(style) {
	let result = '"';

	for (const property of Object.keys(style)) {
		result += `${property}: ${style[property]}; `;
	}
	return result += '"';
}


/* POI CLASS + Cache CLASS */

class POI {
	constructor(xml) {
		this.decodeXML(xml);

	}

	decodeXML(xml) {
		if (xml === null)
			return;
		this.name = getFirstValueByTagName(xml, "name");
		this.latitude = getFirstValueByTagName(xml, "latitude");
		this.longitude = getFirstValueByTagName(xml, "longitude");
	}


}

class Cache extends POI {
	constructor(xml) {
		super(xml);
		this.installMarker();
		this.installCircle();
	}

	installCircle(radius = CACHE_RADIUS, color) {
			let pos = [this.latitude, this.longitude];
			let style = { color: color, fillColor: color, weight: 1, fillOpacity: 0.1 };
			this.circle = L.circle(pos, radius, style);
			this.circle.bindTooltip(this.name);
			map.add(this.circle);
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
		this.marker = L.marker(pos, { icon: map.getIcon(this.kind) });
		this.marker.bindTooltip(this.name);

		this.marker.bindPopup(this.buildPopup())

		map.add(this.marker);

	}

	

	enableDragging() {
		this.marker.dragging.enable();

		if (this.circle) {
			this.marker.on('drag', e => {
				this.circle.setLatLng(e.latlng)
				this.circle.redraw()
			})
		}
	}

	disableDragging() {
		this.marker.dragging.disable();

		if (this.circle) {
			this.marker.off('drag');
		}
	}

	changeLocation() {
		alert('Drag the marker to the new location.')
		this.enableDragging();

		this.marker.once('dragend', () => this.changeLocationHandler())
	}

	changeLocationHandler() {
		this.disableDragging();
		const { lat, lng } = this.marker.getLatLng(); //new location

		const locationValidity = map.validateLocation({ lat, lng }, this);

		if (locationValidity === true) {
			this.latitude = lat;
			this.longitude = lng;
			this.removeMarker();
			this.installMarker();
			alert(`Location of ${this.name} changed to ${lat}, ${lng}`)
		} else {
			this.marker.setLatLng({ lat: this.latitude, lng: this.longitude }); //revert marker location
			if (this.circle) {
				this.circle.setLatLng({ lat: this.latitude, lng: this.longitude }) //revert circle location
			}
			alert(locationValidity.error);
		}
	}

	removeMarker() {
		this.marker.remove();
	}

	removeCircle() {
		if (this.circle) {
			this.circle.remove();
		}
	}

	hide() {
		this.removeMarker();
		this.removeCircle();
	}

	show() {
		this.installMarker();
		this.installCircle();
	}
}

/**
 * Cache that has been loaded from file
 */
class OriginalCache extends Cache {
	constructor(xml) {
		super(xml)
	}

	installCircle(radius = CACHE_RADIUS, color = 'red') {
		if (this.kind == 'Traditional') {
			let pos = [this.latitude, this.longitude];
			let style = { color: color, fillColor: color, weight: 1, fillOpacity: 0.1 };
			this.circle = L.circle(pos, radius, style);
			this.circle.bindTooltip(this.name);
			map.add(this.circle);
		}
	}

	buildPopup() {

		let popup = `
			<div class="popup">
				<h2>${this.name}</h2>

				<!-- cache page -->
				<a href=" https://www.geocaching.com/geocache/${this.code}" target="_blank">
					<button class="background-green">Info</button>
	  			</a>

				<!-- google street view -->
				<a href=" http://maps.google.com/maps?layer=c&cbll=${this.latitude}, ${this.longitude}" target="_blank">
				 	<button class="background-blue">Street View</button>
				</a>
				
			
		`

		switch (this.kind) {
			case "Multi":
			case "Mystery":
			case "Letterbox":
				popup+= 
				`
				<button onClick="changeCacheLocation('${this.code}')" class="background-orange">Change Location</button>
				
				`
		}

		popup+= '</div>';
		return popup;
	}
}

class AddedCache extends Cache {
	constructor(lat, lng) {
		let id = map.generateNewCacheId();
		let txt =
			`<cache>
            <code>NGC${id}</code>
            <name>New Cache ${id}</name>
            <owner>utilizador</owner>
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

	buildPopup() {

		let popup = `
			<div class="popup">
				<h2>${this.name}</h2>

				<!-- google street view button-->
				<a href=" http://maps.google.com/maps?layer=c&cbll=${this.latitude}, ${this.longitude}" target="_blank">
				 	<button class="background-blue">Street View</button>
				</a>

				<!-- change location button -->
				<button onClick="changeCacheLocation('${this.code}')" class="background-orange">Change Location</button>
			
				<!-- delete cache button -->	
				<button onClick="deleteCache('${this.code}')" class="background-red">Delete</button>
				</div>	
		`
		return popup;


	}

	installCircle(radius = CACHE_RADIUS, color = 'green') {
		let pos = [this.latitude, this.longitude];
		let style = { color: color, fillColor: color, weight: 1, fillOpacity: 0.1 };
		this.circle = L.circle(pos, radius, style);
		this.circle.bindTooltip(this.name);
		map.add(this.circle);
	}
}

class AutoAddedCache extends AddedCache {
	constructor(lat, lng) {
		super(lat, lng)
	}

	installCircle(radius = CACHE_RADIUS, color = 'blue') {
		let pos = [this.latitude, this.longitude];
		let style = { color: color, fillColor: color, weight: 1, fillOpacity: 0.1 };
		this.circle = L.circle(pos, radius, style);
		this.circle.bindTooltip(this.name);
		map.add(this.circle);
	}
}

class Place extends POI {
	constructor(name, pos) {
		super(null);
		this.name = name;
		this.latitude = pos[0];
		this.longitude = pos[1];
		this.installCircle();
	}

	installCircle(radius = CACHE_RADIUS, color = 'black') {
		let pos = [this.latitude, this.longitude];
		let style = { color: color, fillColor: color, weight: 1, fillOpacity: 0.1 };
		this.circle = L.circle(pos, radius, style);
		this.circle.bindTooltip(this.name);
		map.add(this.circle);
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
				<div class="popup">
				<h2>${e.latlng.lat}, ${e.latlng.lat}</h2>
				<a href=" http://maps.google.com/maps?layer=c&cbll=${e.latlng.lat}, ${e.latlng.lng}" target="_blank">
    			<button class="background-blue">Street View</button>
  				</a>

				<button onClick="addCache(${e.latlng.lat}, ${e.latlng.lng})" class="background-green">New Cache</button>
				</div>
		`)
		);
		this.addedCacheCounter = 0; //for generating cache id

	}


	populate() {
		this.caches = this.loadCaches(RESOURCES_DIR + CACHES_FILE_NAME);

		this.updateStatistics();
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
		for (let i in specs)
			baseMaps[capitalize(specs[i])] =
				this.makeMapLayer(specs[i], "mapbox/" + specs[i]);
		baseMaps[capitalize(specs[0])].addTo(this.lmap);
		L.control.scale({ maxWidth: 150, metric: true, imperial: false })
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
		for (let i = 0; i < CACHE_KINDS.length; i++) {
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
		if (xs.length === 0)
			alert("Empty cache file");
		else {
			for (let i = 0; i < xs.length; i++)  // Ignore the disabled caches
				if (getFirstValueByTagName(xs[i], "status") === STATUS_ENABLED) {
					let ca = new OriginalCache(xs[i]);
					caches.push(ca);

				}
		}
		return caches;
	}


	/**
	 * Adds cache to the map
	 * @param {Cache} cache chache to be added
	 */
	addCache(cache) {
		this.caches.push(cache);

		this.updateStatistics();
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

	validateLocation(pos, ignore) {
		let { lat, lng } = pos;
		let minimumDistanceToCache = Number.POSITIVE_INFINITY;
		let minimumDistanceToOriginalCache = Number.POSITIVE_INFINITY;

		this.caches.forEach(cache => {
				if (cache != ignore) {
				const distance = haversine(cache.latitude, cache.longitude, lat, lng) * 1000;//km to m
				if (distance < minimumDistanceToCache) {
					minimumDistanceToCache = distance;
				}

				if (cache instanceof OriginalCache && cache.kind == 'Traditional' && distance < minimumDistanceToOriginalCache) {
					minimumDistanceToOriginalCache = distance;
				}
			}
		})

		if (minimumDistanceToCache < CACHE_RADIUS) {
			return { error: `Cache is too close: ${minimumDistanceToCache.toFixed(1)}m to nearest cache, minimum is ${CACHE_RADIUS}m` }
		}

		if (minimumDistanceToOriginalCache > MAX_CACHE_DISTANCE) {
			return { error: `Cache is too far: ${minimumDistanceToOriginalCache.toFixed(1)}m to nearest file loaded cache, maximum is ${MAX_CACHE_DISTANCE}m` }
		}

		return true;
	}

	updateStatistics() {
		let statistics = new Statistics(this.caches);
		statistics.updatePresentationLayer();
	}

	getCacheByCode(code) {
		for (const cache of this.caches) {
			if (cache.code == code) {
				return cache;
			}
		}
		return null;
	}


	changeCacheLocation(code) {
		this.getCacheByCode(code).changeLocation();
	}

	deleteCache(code) {
		const cache = this.getCacheByCode(code);
		cache.removeMarker();
		cache.removeCircle();
		const index = this.caches.indexOf(cache);
		this.caches.splice(index, 1);

		this.updateStatistics();
	}

	newRandomCache() {
		let index = Math.floor(Math.random() * this.caches.length);
		let oldCache = this.caches[index];

		try{
		let pos = this.generateValidCoordinates(oldCache, 1000);

		const newCache = new AutoAddedCache(pos.lat, pos.lng);
		map.addCache(newCache);
		}catch(e){
			alert(e.message)
		}
	}
	
	/*
	 The generation of as many caches as possible is done by the function named 
	manyNewRandomCaches().
	 This function creates a variable total to count the amount of caches created and starts a 
	for loop of generation passes.
	 WARNING: these passes have exponential growth, since they iterate over the whole array of 
	caches, which is in turn being increased by the function itself, meaning that
	if the max distance is increased, the whole function will take much longer to execute.
	
	 Next, the generationPass() function is called. This function registers the current total 
	as 0 and then starts to iterate the existing array (it will not make a pass over the 
	newly created caches, only the ones that exist already). For each existing cache, the 
	function will then try to create a new cache in a location close to the chosen 
	cache. For this, it attempts to generate a set off coordinates close to the chosen cache.
	 Each attempt is limited to 10 miliseconds, otherwise, too much time
	would be wasted looking at invalid spots.
	 If a set of valid coordinates is created, a new cache is created and the total variable is 
	increased. Otherwise the function simply tries again. This stops after 10 tries, 
	successfull or not.

	 The function that generates the coordinates works by getting two random values
		 The first is used in the sin() and cos() functions to choose a random angle at which the 
		coordinates will be created, centered on an already existing cache.
		 The second is used to place the new set of coordinates a certain distance away from the 
		"original" cache.
	 These two variables are useed to create a new set of coordinates relatively close to the 
	"original cache". They are still checked of course, as the original location could be
	obstructed or not valid to start with (although, with the method in place that should be very rare).
	*/
	manyNewRandomCaches() {
		let total = 0;
		for(let i = 0; i < 2; i++)
			total += this.generationPass();

		alert(`${total} caches created`);
	}

	generationPass() {
		let total = 0;
		for(let i = 0; i < this.caches.length; i++){
			let j = 0;
			try{
				while(j < 10){
				let pos = this.generateValidCoordinates(this.caches[i], 10);

				const newCache = new AutoAddedCache(pos.lat, pos.lng);
				map.addCache(newCache);
				j++; 
				total++;
				}
			}catch(e){
				j++;
			}
		}
		return total;
	}

	generateValidCoordinates(oldCache, delay) {
		var start = Date.now();
		let valid = false;
		let lat, lng;

		while (!valid && ((Date.now() - start) < delay)) {
			let rad = (Math.random() * (Math.PI * 2));
			let dist = 0.004 * (Math.random() + 1);

			lat = (parseFloat(oldCache.latitude) + ((Math.sin(rad)) * dist));
			lng = (parseFloat(oldCache.longitude) + ((Math.cos(rad)) * dist));

			valid = this.validateLocation({ lat, lng }) === true;
		}

		if(!valid){
			throw new Error('Location not found');
		}
		return { lat, lng };
	}

	generateNewCacheId() {
		return this.addedCacheCounter++;
	}

	showCachesOfKind(toggle, kind) {
		this.caches.filter(cache => cache.kind == kind)
			.forEach(cache => toggle ? cache.show() : cache.hide())
	}
}

class Statistics {
	constructor(caches) {
		this.caches = caches;
	}

	updatePresentationLayer() {
		
		// Cache by kind:
		const cachesByKind = this.getNumberOfCachesOfEachKind();

		for (const kind of Object.keys(cachesByKind)) {
			let amountElement = document.getElementById(kind + "-amount");


			if (amountElement) {
				amountElement.innerText = ` [${cachesByKind[kind]}]`;
			}

		}

		let statisticsDiv = document.querySelector('#statistics'); //querying for the element with id="statistics"


		let ownerElem = document.getElementById('statistic-max-owner');
		if (ownerElem == null) {
			ownerElem = document.createElement('p');
			ownerElem.id = 'statistic-max-owner';
		}
		let prolificOwner = this.getMostProlificOwner();

		ownerElem.innerText = `Most prolific owner: ${prolificOwner.name} (${prolificOwner.amount} caches)`;

		statisticsDiv.appendChild(ownerElem);
		

		let highestElem = document.getElementById('statistic-max-alt');
		if (highestElem == null) {
			highestElem = document.createElement('p');
			highestElem.id = 'statistic-max-alt';
		}
		let highestCache = this.getCacheWithHighestAltitude();

		highestElem.innerText = `Highest altitude: ${highestCache.name} (${highestCache.altitude}m)`;

		statisticsDiv.appendChild(highestElem);

		let lowestElem = document.getElementById('statistic-min-alt');
		if (lowestElem == null) {
			lowestElem = document.createElement('p');
			lowestElem.id = 'statistic-min-alt';
		}
		let lowestCache = this.getCacheWithLowestAltitude();

		lowestElem.innerText = `Lowest altitude: ${lowestCache.name} (${lowestCache.altitude}m)`;

		statisticsDiv.appendChild(lowestElem);

	}

	getNumberOfCachesOfEachKind() {
		let result = {};
		this.caches.forEach(cache => {
			if (result[cache.kind]) {
				result[cache.kind]++;
			} else {
				result[cache.kind] = 1;
			}
		})
		return result;
	}

	getCacheWithHighestAltitude() {
		return this.caches.reduce((highest, current) => current.altitude > highest.altitude ? current : highest);
	}

	getCacheWithLowestAltitude() {
		return this.caches.filter(cache => cache.altitude != UNKNOWN_ALTITUDE)
						.reduce((lowest, current) => {
							if (current.altitude < lowest.altitude) {
								return current;
							}
							return lowest;
						});
	}

	getMostProlificOwner() {
		let cachesByName = this.caches
			.reduce((cachesByName, currentCache) => {
			let name = currentCache.owner;
			if (name in cachesByName) {
				cachesByName[name]++
			}
			else {
				cachesByName[name] = 1
			}
			return cachesByName
		  	}, {})

		let result = {
			name: "",
			amount: 0
		};

		for (const owner in cachesByName) {
			if (cachesByName[owner] > result.amount) {
				result.name = owner;
				result.amount = cachesByName[owner];
			}
		}

		return result;
	}

}




/* Some FUNCTIONS are conveniently placed here to be directly called from HTML.
   These functions must invoke operations defined in the classes, because
   this program must be written using the object-oriented style.
*/

function onLoad() {
	let cacheKindsElement = document.getElementById('cache-kinds');

	for (const kind of CACHE_KINDS) {
		let line = document.createElement('p');
		let checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.checked = true;
		checkbox.addEventListener('change', (e) => {
			console.log(e.target.checked, kind)
			map.showCachesOfKind(e.target.checked, kind)
		})
		let icon = document.createElement('img');
		let name = document.createElement('span');
		let amount = document.createElement('span');
		amount.id = kind + "-amount"

		icon.src = RESOURCES_DIR + kind + ".png";
		name.innerText = kind;
		line.appendChild(checkbox);
		line.appendChild(icon);
		line.appendChild(name);
		line.appendChild(amount);
		cacheKindsElement.appendChild(line);
	}

	map = new Map(MAP_INITIAL_CENTRE, MAP_INITIAL_ZOOM);
	map.showFCT();
	map.populate();
}

function addCache(lat, lng) {
	const locationValidity = map.validateLocation({ lat, lng });
	if (locationValidity.error) {
		alert(locationValidity.error)
	} else {
		const newCache = new AddedCache(lat, lng);
		map.addCache(newCache);
	}
}

function changeCacheLocation(code) {
	map.changeCacheLocation(code);
}

function deleteCache(code) {
	map.deleteCache(code);
}

function newRandomCache() {
	map.newRandomCache();
}

function manyNewRandomCaches() {
	map.manyNewRandomCaches();
}


