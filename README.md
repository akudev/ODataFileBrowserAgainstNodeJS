# ODataFileBrowserAgainstNodeJS

## Overview 

Simple OpenUI5 file browser using the TreeTable and ODataTreeBinding, but without OData backend: instead, there is just a Node.js-based server which emulates the OData behavior for the needed subset of requests.

See https://blogs.sap.com/2019/01/02/trees-in-sapui5-build-a-ui5-file-browser-with-odatamodel-on-client-side-but-pure-node.js-no-odata-as-server/ for more background on this project.


## NOTE 
* This is just a quickly hacked example to demonstrate how the UI5 ODataTreeBinding (from the v2 ODataModel) can be used with the TreeTable control and how a simple Node.js server can be implemented which understands the requests from the ODataModel and supports the paging requests triggered by the TreeTable control.
* This code is NOT guaranteed to work reliable or to be a clean and correct implementation.
* Despite basic measures to keep the file browsing within a specific subdirectory, it could be that the server side provides read access to all file names on the computer running the app, so use it only for limited-time testing.
* This app has only been tested on Windows. File access on other operating systems might not work correctly.

## Background: Trees in OData v2
Hierarchical data in OData is flattened: there is only a flat list from a data transfer protocol perspective, but each data element contains information about its position in the virtual hierarchy, so the ODataTreeBinding can request the content of certain nodes by filtering for elements which have this node as parent.
The physical persistency in this app is the file system, which *is* hierarchical, so the filtering operation is actually going to the requested directory and getting all files from there.

## How the App Works
The client side is a regular TreeTable bound against a path in a v2 ODataModel. It does not even notice that the server it talks to is no real ODataService.
The server side is a simple express server which understands the $skip and $top parameters and the $filter (which filters for the parent ID in the ODataTreeBinding) from the OData request. It then collects all files in the requested directory but only sends back the requested subset of the list (according to $skip and $top).

Additional filters (e.g. for file names or extensions) are not supported and would have to be parsed out of the then-more-complex $filter parameter.

## How to Run
1. Clone this repository and navigate into it
    ```sh
    git clone https://github.com/akudev/ODataFileBrowserAgainstNodeJS.git
    cd ODataFileBrowserAgainstNodeJS
    ```
1. Install all dependencies
    ```sh
    npm install
    ```

1. Start a local server and run the application (http://localhost:2019)
    ```sh
    npm start
    ```
    
For a more interesting browsing experience, put some more files into app/rootDirectoryForBrowser.