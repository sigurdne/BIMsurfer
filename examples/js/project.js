var address = QueryString.address;
var token = QueryString.token;

/* Generating a new version based on the current time, this way resources are never cached
 When building a version of BIMsurfer V2 this should be replaced by an actual version number in order
 To facilitate proper caching
*/
var version = new Date().getTime();

// This has been moved to bimserverapi, can be removed in a day
String.prototype.firstUpper = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

// Because the demo is in a subfolder compared to the BIMsurfer API, we tell require JS to use the "../" baseUrl
var version = new Date().getTime();
require.config({
    baseUrl: "../",
    urlArgs: "bust=" + version
});

// Loads a model from BIMServer, builds an explorer tree UI.
// Clicking on a tree node fits the view to its scene object.

var apiVersion = new Date().getTime();

require([
    "bimsurfer/src/BimSurfer",
    "bimsurfer/src/BimServerModelLoader",
    "bimsurfer/src/StaticTreeRenderer",
    "bimsurfer/src/MetaDataRenderer",
    "bimsurfer/lib/domReady!"],
    function (BimSurfer, BimServerModelLoader, StaticTreeRenderer, MetaDataRenderer) {

        function processBimSurferModel(roid, bimSurferModel) {
            bimSurferModel.getTree().then(function (tree) {
                // Build a tree view of the elements in the model. The fact that it
                // is 'static' refers to the fact that all branches are loaded and
                // rendered immediately.
                var domtree = new StaticTreeRenderer({
                    domNode: 'treeContainer'
                });
                domtree.addModel({ name: "", id: roid, tree: tree });
                domtree.build();

                // Add a widget that displays metadata (IfcPropertySet and instance
                // attributes) of the selected element.
                var metadata = new MetaDataRenderer({
                    domNode: 'dataContainer'
                });
                metadata.addModel({ name: "", id: roid, model: bimSurferModel });

                bimSurfer.on("selection-changed", function (params) {
                    domtree.setSelected(params.objects, domtree.SELECT_EXCLUSIVE);
                    metadata.setSelected(params.objects);

                    console.log("Clicked", params.clickPosition);
                });

                domtree.on("click", function (oid, selected) {
                    // Clicking an explorer node fits the view to its object and selects
                    if (selected.length) {
                        bimSurfer.viewFit({
                            ids: selected,
                            animate: true
                        });
                    }
                    bimSurfer.setSelection({
                        ids: selected,
                        clear: true,
                        selected: true
                    });
                });


                // Write API ref

                var flatten = function (n) {
                    var li = []
                    var f = function (n) {
                        li.push(n.id);
                        (n.children || []).forEach(f);
                    }
                    f(n);
                    return li;
                };

                var oids = flatten(tree);
                _.shuffle(oids);
                oids.splice(10);
                var guids = bimSurfer.toGuid(oids);

                oids = "[" + oids.join(", ") + "]";
                guids = "[" + guids.map(function (s) { return '"' + s + '"'; }).join(", ") + "]";

                var METHODS = [
                    { name: 'setVisibility', args: [{ name: "ids", value: oids }, { name: "visible", value: false }] },
                    { name: 'setVisibility', args: [{ name: "types", value: '["IfcWallStandardCase"]' }, { name: "visible", value: false }] },
                    { name: 'setSelectionState', args: [{ name: "ids", value: oids }, { name: "selected", value: true }] },
                    { name: 'getSelected', args: [], hasResult: true },
                    { name: 'toId', args: [guids], hasResult: true },
                    { name: 'toGuid', args: [oids], hasResult: true },
                    { name: 'setColor', args: [{ name: "ids", value: oids }, { name: "color", value: "{r:1, g:0, b:0, a:1}" }] },
                    { name: 'viewFit', args: [{ name: "ids", value: oids }, { name: "animate", value: 500 }] },
                    { name: 'setCamera', args: [{ name: "type", value: "'ortho'" }] },
                    { name: 'getCamera', args: [], hasResult: true },
                    { name: 'reset', args: [{ name: "cameraPosition", value: true }] },
                ];

                var n = document.getElementById('apirefContainer');

                METHODS.forEach(function (m, i) {
                    n.innerHTML += "<h2>" + m.name + "()</h2>";

                    var hasNamedArgs = false;
                    var args = m.args.map(function (a) {
                        if (a.name) {
                            hasNamedArgs = true;
                            return a.name + ":" + a.value;
                        } else {
                            return a;
                        }
                    }).join(", ");

                    if (hasNamedArgs) {
                        args = "{" + args + "}";
                    }

                    var cmd = "bimSurfer." + m.name + "(" + args + ");";
                    n.innerHTML += "<textarea rows=3 id='code" + i + "' spellcheck=false>" + cmd + "\n</textarea>";
                    exec_statement = "eval(document.getElementById(\"code" + i + "\").value)"
                    if (m.hasResult) {
                        exec_statement = "document.getElementById(\"result" + i + "\").innerHTML = JSON.stringify(" + exec_statement + ").replace(/,/g, \", \")";
                    } else {
                        exec_statement += "; window.scrollTo(0,0)"
                    }
                    n.innerHTML += "<button onclick='" + exec_statement + "'>run</button>";
                    if (m.hasResult) {
                        n.innerHTML += "<pre id='result" + i + "' />";
                    }
                });
            });
        }

        var bimSurfer = new BimSurfer({
            domNode: "viewerContainer"
        });

        bimSurfer.on("loading-finished", function () {
            document.getElementById("status").innerHTML = "Loading finished";
            var domNode = document.getElementById("typeSelector");
            domNode.innerHTML = "";
            bimSurfer.getTypes().forEach(function (ifc_type) {
                var on = ifc_type.visible;
                var d = document.createElement("div");
                var t = document.createTextNode(ifc_type.name);
                var setClass = function () {
                    d.className = "fa fa-eye " + ["inactive", "active"][on * 1];
                };
                setClass();
                d.appendChild(t);
                domNode.appendChild(d);
                d.onclick = function () {
                    on = !on;
                    setClass();
                    bimSurfer.setVisibility({ types: [ifc_type.name], visible: on });
                };
            });
        });
        bimSurfer.on("loading-started", function () {
            document.getElementById("status").innerHTML = "Loading...";
        });

        // Lets us play with the Surfer in the console
        window.bimSurfer = bimSurfer;

        // Create a BIMserver API, we only need one of those for every server we connect to
        //  var bimServerClient = new BimServerClient(address, null);
        var bimServerClient = window.BimServerClient;
        bimServerClient.init(function () {
            bimServerClient.setToken(token, function () {
                // Create a model loader, this one is able to load models from a BIMserver and therefore can have BIMserver specific calls
                var modelLoader = new BimServerModelLoader(bimServerClient, bimSurfer);

                var models = {}; // roid -> Model

                // For this example, we'll fetch all the latest revisions of all the subprojects of the main project
                var poid = QueryString.poid;

                var nrProjects;

                function loadModels(models, totalBounds) {
                    var center = [
                        (totalBounds.min[0] + totalBounds.max[0]) / 2,
                        (totalBounds.min[1] + totalBounds.max[1]) / 2,
                        (totalBounds.min[2] + totalBounds.max[2]) / 2
                    ];

                    var globalTransformationMatrix = [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        -center[0], -center[1], -center[2], 1
                    ];
                    console.log(totalBounds, models);

                    for (var roid in models) {
                        var model = models[roid];
                        // Example 1: Load a full model
                        modelLoader.setGlobalTransformationMatrix(globalTransformationMatrix);
                        modelLoader.loadFullModel(model).then(function (bimSurferModel) {
                            processBimSurferModel(roid, bimSurferModel);
                        });

                        // Example 2: Load a list of objects (all walls and subtypes)
                           				                	// var objects = [];
                           				                	// model.getAllOfType("IfcWall", true, function(wall){
                           				                	// 	objects.push(wall);
                           				                	// }).done(function(){
                           						            //     modelLoader.loadObjects(model, objects).then(function(bimSurferModel){
                           						            //         processBimSurferModel(roid, bimSurferModel);
                           						            //     });
                           				                	// });

                        // Example 3: Load the results of a query
                        //    				                	var objects = [];
                        //    				                	var query = {
                        //    				                		types: ["IfcDoor", "IfcWindow"]
                        //    				                	};
                        //    				                	model.query(query, function(object){
                        //    				                		objects.push(object);
                        //    				                	}).done(function(){
                        //    						                modelLoader.loadObjects(model, objects).then(function(bimSurferModel){
                        //    						                    processBimSurferModel(roid, bimSurferModel);
                        //    						                });
                        //    				                	});
                    }
                }

                bimServerClient.call("ServiceInterface", "getAllRelatedProjects", { poid: poid }, function (projects) {
                    nrProjects = projects.length;

                    var totalBounds = {
                        min: [Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE],
                        max: [-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE]
                    };

                    projects.forEach(function (project) {
                        if (project.lastRevisionId != -1 && (project.nrSubProjects == 0 || project.oid != poid)) {
                            bimServerClient.getModel(project.oid, project.lastRevisionId, project.schema, false, function (model) {
                                models[project.lastRevisionId] = model;

                                bimServerClient.call("ServiceInterface", "getModelMinBounds", { roid: project.lastRevisionId }, function (minBounds) {
                                    bimServerClient.call("ServiceInterface", "getModelMaxBounds", { roid: project.lastRevisionId }, function (maxBounds) {
                                        if (minBounds.x < totalBounds.min[0]) {
                                            totalBounds.min[0] = minBounds.x;
                                        }
                                        if (minBounds.y < totalBounds.min[1]) {
                                            totalBounds.min[1] = minBounds.y;
                                        }
                                        if (minBounds.z < totalBounds.min[2]) {
                                            totalBounds.min[2] = minBounds.z;
                                        }
                                        if (maxBounds.x > totalBounds.max[0]) {
                                            totalBounds.max[0] = maxBounds.x;
                                        }
                                        if (maxBounds.y > totalBounds.max[1]) {
                                            totalBounds.max[1] = maxBounds.y;
                                        }
                                        if (maxBounds.z > totalBounds.max[2]) {
                                            totalBounds.max[2] = maxBounds.z;
                                        }
                                        nrProjects--;
                                        if (nrProjects == 0) {
                                            loadModels(models, totalBounds);
                                        }
                                    });
                                });
                            });
                        } else {
                            nrProjects--;
                            if (nrProjects == 0) {
                                loadModels(models, totalBounds);
                            }
                        }
                    });
                });
            });
        });
    });

