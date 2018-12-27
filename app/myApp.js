var path = require("path");
var fs = require("fs");

"use strict";


const bMOCK = false; // decide here whether mock data from data directory should be used (metadata is always taken from there)
const sRootDirectoryForBrowser = path.join(".", "app", "rootDirectoryForBrowser"); // the directory below which the browser will operate
	// can be changed to e.g. "C:\\" on Windows to browse your entire main drive - change at your own risk, as anyone could browse your file structure over the network!

const rParentFileIDPattern = /ParentFileID eq '([^']*)'/;  // this is how ODataTreeBinding requests the content of a node/folder

var sSeparator = path.sep;
if (sSeparator === "\\") { // if backslash (Windows), it needs to be doubled to be escaped
	sSeparator += path.sep;
}
const rPathSeparatorMulti = new RegExp(sSeparator, "g"); // needed later to escape/replace slashes/backslashes in node IDs


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
			sPath = path.join(...match[1].split("%2f")); // restore actual path from escaped ID
		} else {
			sPath = path.sep;
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
		var aParts = sDirectoryPath.split(path.sep).filter(part => part.length > 0);
		var aFiles = [];
		var iHierarchyLevel = aParts.length;
		var sParentFileID = null;
		var sFileName;
		var sDrillState;
	
		// now get the full file listing - TODO: here caching could be used or maybe also just the required subset of files could be retrieved
		var aFileNames = fs.readdirSync(path.join(sRootDirectoryForBrowser, sDirectoryPath)); // TODO: use async version, but somehow it does not work for me

		var iCount = aFileNames.length; // this is the total number of files in this directory, needed for the OData count, so the tree knows how many more are there

		var iMax = Math.min(iStartIndex + iLength, aFileNames.length); // loop until either there are no more files or the requested paging window is full

		
		for (var i = iStartIndex; i < iMax; i++) { // only loop the requested subset of files
			sFileName = aFileNames[i];
			try {
				sDrillState = isDirectory(path.join(sRootDirectoryForBrowser, sDirectoryPath, sFileName)) ? "collapsed" : "leaf"; // whether it is a directory; "collapsed" (not "expanded") because we are only loading the next hierarchy level, not several levels
			} catch (e) { // likely not authorized to access the file - treat it as a plain file; we could ignore it, but then the overall iCount would not be correct
				sDrillState = "leaf"
			}
			
			var sFullPath = path.join(sDirectoryPath, sFileName);
			sFullPath = sFullPath.replace(rPathSeparatorMulti, "%2f"); // escape the slashes or backslashes in the path to create a valid ID;  TODO: correct escaping (in case %2f exists as part of the file name)
	
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