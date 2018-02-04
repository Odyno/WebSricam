'use strict';
process.chdir(__dirname);

var onvif = null;
try {
	onvif = require('../../lib/node-onvif.js');
} catch (e) {
	onvif = require('node-onvif');
}

var ffmpeg = require('fluent-ffmpeg');
var toArray = require('stream-to-array')
var streamBuffers = require('stream-buffers');
var ws = require('websocket.io');
var http = require('http');
var fs = require('fs');
var port = 8880;

(function main() {
	var http_server = http.createServer(httpServerRequest);
	http_server.listen(port, function() {
		console.log("Listening on port " + port);
	});
	var wsserver = ws.attach(http_server);
	wsserver.on('connection', wsServerRequest);
})();

function httpServerRequest(req, res) {
	var path = req.url.replace(/\?.*$/, '');
	if (path.match(/\.{2,}/) || path.match(/[^a-zA-Z\d\_\-\.\/]/)) {
		httpServerResponse404(req.url, res);
		return;
	}
	if (path === '/') {
		path = '/index.html';
	}
	var fpath = './html' + path;
	fs.readFile(fpath, 'utf-8', function(err, data) {
		if (err) {
			httpServerResponse404(req.url, res);
			return;
		} else {
			var ctype = getContentType(fpath);
			res.writeHead(200, {'Content-Type': ctype});
			res.write(data);
			res.end();
			console.log('HTTP : 200 OK : ' + req.url);
		}
	});
}

function getContentType(fpath) {
	var ext = fpath.split('.').pop().toLowerCase();
	if (ext.match(/^(html|htm)$/)) {
		return 'text/html';
	} else if (ext.match(/^(jpeg|jpg)$/)) {
		return 'image/jpeg';
	} else if (ext.match(/^(png|gif)$/)) {
		return 'image/' + ext;
	} else if (ext === 'css') {
		return 'text/css';
	} else if (ext === 'js') {
		return 'text/javascript';
	} else if (ext === 'woff2') {
		return 'application/font-woff';
	} else if (ext === 'woff') {
		return 'application/font-woff';
	} else if (ext === 'ttf') {
		return 'application/font-ttf';
	} else if (ext === 'svg') {
		return 'image/svg+xml';
	} else if (ext === 'eot') {
		return 'application/vnd.ms-fontobject';
	} else if (ext === 'oft') {
		return 'application/x-font-otf';
	} else {
		return 'application/octet-stream';
	}
}

function httpServerResponse404(url, res) {
	res.writeHead(404, {'Content-Type': 'text/plain'});
	res.write('404 Not Found: ' + url);
	res.end();
	console.log('HTTP : 404 Not Found : ' + url);
}

var client_list = [];

function wsServerRequest(conn) {
	conn.on("message", function(message) {
		var data = JSON.parse(message);
		var method = data['method'];
		var params = data['params'];
		if (method === 'startDiscovery') {
			//startDiscovery(conn);
			startConnection(conn);
		} else if (method === 'connect') {
			connect(conn, params);
		} else if (method === 'fetchSnapshot') {
			//fetchSnapshot(conn, params);
			fetchSnapshotWithFFMPG(conn, params);
		} else if (method === 'ptzMove') {
			ptzMove(conn, params);
		} else if (method === 'ptzStop') {
			ptzStop(conn, params);
		} else if (method === 'ptzHome') {
			ptzHome(conn, params);
		}
	});

	conn.on("close", function(message) {});
	conn.on("error", function(error) {
		console.log(error);
	});
};

var devices = {};
function startConnection(conn) {
	let odevice = new onvif.OnvifDevice({xaddr: 'http://192.168.178.37:5000/onvif1/device_service'});

	let addr = odevice.address;
	devices[addr] = odevice;

	var devs = {};
	devs[addr] = {
		name: "192.168.178.37",
		address: addr
	}

	let res = {
		'id': 'startDiscovery',
		'result': devs
	};
	conn.send(JSON.stringify(res));
}

function startDiscovery(conn) {
	devices = {};
	let names = {};
	onvif.startProbe().then((device_list) => {
		device_list.forEach((device) => {
			let odevice = new onvif.OnvifDevice({xaddr: device.xaddrs[0]});
			let addr = odevice.address;
			devices[addr] = odevice;
			names[addr] = device.name;
		});
		var devs = {};
		for (var addr in devices) {
			devs[addr] = {
				name: names[addr],
				address: addr
			}
		}
		let res = {
			'id': 'startDiscovery',
			'result': devs
		};
		conn.send(JSON.stringify(res));
	}).catch((error) => {
		let res = {
			'id': 'connect',
			'error': error.message
		};
		conn.send(JSON.stringify(res));
	});
}

function connect(conn, params) {
	var device = devices[params.address];
	if (!device) {
		var res = {
			'id': 'connect',
			'error': 'The specified device is not found: ' + params.address
		};
		conn.send(JSON.stringify(res));
		return;
	}
	if (params.user) {
		device.setAuth(params.user, params.pass);
	}
	device.init((error, result) => {
		var res = {
			'id': 'connect'
		};
		if (error) {
			res['error'] = error.toString();
		} else {
			res['result'] = result;
		}
		conn.send(JSON.stringify(res));
	});
}

function fetchSnapshotWithFFMPG(conn, params) {
	console.log("Request a snapshot");
	var device = devices[params.address];
	if (!device) {
		var res = {
			'id': 'fetchSnapshot',
			'error': 'The specified device is not found: ' + params.address
		};
		conn.send(JSON.stringify(res));
		return;
	}
	let url = device.getUdpStreamUrl();
	var res = {
		'id': 'fetchSnapshot'
	};
console.log("creolo stream");
	var myWritableStreamBuffer = new streamBuffers.WritableStreamBuffer(
	
	); 
console.log("preparo ffmpeg");  
	ffmpeg(device.getUdpStreamUrl())
		.noAudio()
		        .addOptions([
				'-f image2',
				'-vcodec mjpeg',
				'-q:v 1',
				'-vframes 1'
			])
		.on('error', (err) => {
		        console.log('An error occurred: ' + err.message);
			res['error'] = err.toString();
		        conn.send(JSON.stringify(res));
		})
		.on('end', () => {

			console.log('Prepare:');
			var ct = 'image/png'
			var b64 = myWritableStreamBuffer.getContents().toString('base64');
			var uri = 'data:' + ct + ';base64,' + b64;
			res['result'] = uri;
			
	console.log("sent!");
		        conn.send(JSON.stringify(res));
		})
		.writeToStream(myWritableStreamBuffer, { end: true } );

}


function fetchSnapshot(conn, params) {
	// For Debug --------------------------------------------
	//if(start_time === 0) {
	//	start_time = Date.now();
	//}
	// ------------------------------------------------------
	var device = devices[params.address];
	if (!device) {
		var res = {
			'id': 'fetchSnapshot',
			'error': 'The specified device is not found: ' + params.address
		};
		conn.send(JSON.stringify(res));
		return;
	}
	device.fetchSnapshot((error, result) => {
		var res = {
			'id': 'fetchSnapshot'
		};
		if (error) {
			res['error'] = error.toString();
		} else {
			var ct = result['headers']['content-type'];
			var buffer = result['body'];
			var b64 = buffer.toString('base64');
			var uri = 'data:' + ct + ';base64,' + b64;
			res['result'] = uri;

			// For Debug --------------------------------------------
			/*
			total_size += parseInt(result['headers']['content-length'], 10);
			var duration = Date.now() - start_time;
			var bps = total_size * 1000 / duration;
			var kbps = parseInt(bps / 1000);
			total_frame ++;
			var fps = Math.round(total_frame * 1000 / duration);
			console.log(kbps + ' kbps / ' + fps + ' fps');
			*/
			// ------------------------------------------------------
		}
		conn.send(JSON.stringify(res));
	});
}

function ptzMove(conn, params) {
	var device = devices[params.address];
	if (!device) {
		var res = {
			'id': 'ptzMove',
			'error': 'The specified device is not found: ' + params.address
		};
		conn.send(JSON.stringify(res));
		return;
	}
	device.ptzMove(params, (error) => {
		var res = {
			'id': 'ptzMove'
		};
		if (error) {
			res['error'] = error.toString();
		} else {
			res['result'] = true;
		}
		conn.send(JSON.stringify(res));
	});
}

function ptzStop(conn, params) {
	var device = devices[params.address];
	if (!device) {
		var res = {
			'id': 'ptzStop',
			'error': 'The specified device is not found: ' + params.address
		};
		conn.send(JSON.stringify(res));
		return;
	}
	device.ptzStop((error) => {
		var res = {
			'id': 'ptzStop'
		};
		if (error) {
			res['error'] = error.toString();
		} else {
			res['result'] = true;
		}
		conn.send(JSON.stringify(res));
	});
}

function ptzHome(conn, params) {
	var device = devices[params.address];
	if (!device) {
		var res = {
			'id': 'ptzMove',
			'error': 'The specified device is not found: ' + params.address
		};
		conn.send(JSON.stringify(res));
		return;
	}
	if (!device.services.ptz) {
		var res = {
			'id': 'ptzHome',
			'error': 'The specified device does not support PTZ.'
		};
		conn.send(JSON.stringify(res));
		return;
	}

	var ptz = device.services.ptz;
	var profile = device.getCurrentProfile();
	var params = {
		'ProfileToken': profile['token'],
		'Speed': 1
	};
	ptz.gotoHomePosition(params, (error, result) => {
		var res = {
			'id': 'ptzMove'
		};
		if (error) {
			res['error'] = error.toString();
		} else {
			res['result'] = true;
		}
		conn.send(JSON.stringify(res));
	});
}
