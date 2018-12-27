var express = require('express');
var path = require('path');
var http = require('http');
var app = express();
var server = http.createServer(app);

var myApp = require('./app/myApp.js');

"use strict";

var iPort = 2019;

app.get('/filebrowser/:resource', function (req, res) {
	console.log("Requested resource: " + req.params.resource + " (" + JSON.stringify(req.query) + ")"); // http://localhost:2019/filebrowser/xyz  =>  resource is: xyz
	
	if (req.params.resource === "$metadata") { // the OData metadata document describes the data structure; serve it from the respective file
		res.type('application/xml');
		res.set('Content-Type', 'application/xml');
		res.sendFile(path.join(__dirname, "app", "data", "metadata.xml"));
	} else {
		myApp.handleDirectoryContentRequest(req, res);
	}
});

// default fallback: serve all unspecified URLs as static resources from below the "www" folder ("/" is mapped to "index.html")
app.use(express.static(path.join(__dirname, 'webapp')));

server.listen(iPort, () => console.log('Listening on localhost port ' + iPort));
