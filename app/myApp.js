var path = require('path');
var fs = require('fs');

"use strict";


const bMOCK = false; // decide here whether mock data from data directory should be used (metadata is always taken from there)
const rParentFileIDPattern = /ParentFileID eq '([^']*)'/;  // this is how ODataTreeBinding requests the content of a node/folder

const _handleDirectoryContentRequest = function(req, res) {
	var sPath;

	if (bMOCK) {
		res.type('application/json');
		res.set('Content-Type', 'application/json');
		res.sendFile(path.join(__dirname, 'data/data.json'));
	} else {
		// get path and paging information from the OData request
		var iStartIndex = parseInt(req.query["$skip"]);
		var iLength = parseInt(req.query["$top"]);
		var sFilter = req.query["$filter"];
		var match = rParentFileIDPattern.exec(sFilter);
		if (match) {
			sPath = match[1].replace(/%2f/g, "/"); // restore actual path from escaped ID
		} else {
			sPath = "/";
		}

		var oData = _getDirectoryListing(sPath, iStartIndex, iLength).then(oData => res.json({ // here the response is sent
			"d": oData // OData wants everything to be below "d"
		}));		
	}
}

const isDirectory = function(sPath) {
	return fs.statSync(sPath).isDirectory();
}

// gets all files residing in the given folder path and returns them in a structure as required by ODataTreeBinding
const _getDirectoryListing = function(sDirectoryPath, iStartIndex, iLength) {
	return new Promise(function(resolve, reject) { // be prepared for async implementation
		sDirectoryPath = sDirectoryPath.replace(/\.\./g, ""); // avoid going up in the hierarchy (do not allow access outside sandbox folder)
		var aParts = sDirectoryPath.split("/").filter(part => part.length > 0);
		var aFiles = [];
		var iHierarchyLevel = aParts.length;
		var sParentFileID = null;
		var sFileName;
	
		// now get the full file listing - TODO: here caching could be used or maybe also just the required subset of files could be retrieved
		var aFileNames = fs.readdirSync("./app/rootDirectoryForBrowser" + sDirectoryPath); // TODO: use async version, but somehow it does not work for me

		var iCount = aFileNames.length; // this is the total number of files in this directory, needed for the OData count, so the tree knows how many more are there

		var iMax = Math.min(iStartIndex + iLength, aFileNames.length); // loop until either there are no more files or the requested paging window is full

		for (var i = iStartIndex; i < iMax; i++) { // only loop the requested subset of files
			sFileName = aFileNames[i];
			var sDrillState = isDirectory("./app/rootDirectoryForBrowser" + sDirectoryPath + "/" + sFileName) ? "collapsed" : "leaf"; // whether it is a directory; nore sure what "expanded" vs "collapsed" means here, both are shown as collapsed folder
			
			var sFullPath = sDirectoryPath + "/" + sFileName;
			sFullPath = sFullPath.replace(/\//g, "%2f"); // escape the slashes in the path to create a valid ID;  TODO: correct escaping (in case %2f exists as part of the file name)
	
			// OData needs some more info on client side than just the file name
			aFiles.push({
				"Name": sFileName,
				"FileID": sFullPath,
				"HierarchyLevel": iHierarchyLevel,
				"Description": "some file",
				"ParentFileID": sParentFileID,
				"DrillState": sDrillState,
				"__metadata": {
					"id": sFullPath,
					"type": "DemoModel.File",
					"uri": "Files(" + sFullPath + ")"
				}
			});
		}
	
		resolve({
			"results": aFiles,
			"__count": iCount
		});
	});
}

module.exports = {
	handleDirectoryContentRequest: _handleDirectoryContentRequest
};