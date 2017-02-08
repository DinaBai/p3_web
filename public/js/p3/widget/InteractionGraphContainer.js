define.amd.jQuery = true;
define([
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/on", "dojo/topic", "dojo/query", "dojo/request", "dojo/dom-construct", "dojo/dom-style", "dojo/dom-class",
	"dijit/layout/BorderContainer", "dijit/layout/ContentPane", "dijit/popup", "dijit/TooltipDialog", "dijit/Dialog",
	"cytoscape-panzoom/cytoscape-panzoom", "cytoscape-context-menus/cytoscape-context-menus",
	"cytoscape-cola/cytoscape-cola", "cytoscape-dagre/cytoscape-dagre", /*"cytoscape-cose-bilkent/cytoscape-cose-bilkent",*/
	"./ContainerActionBar", "./ActionBar", "./ItemDetailPanel", "./InteractionOps", "FileSaver", "../util/PathJoin",
	"./PerspectiveToolTip", "./SelectionToGroup"
], function(declare, lang,
			on, Topic, query, request, domConstruct, domStyle, domClass,
			BorderContainer, ContentPane, popup, TooltipDialog, Dialog,
			cyPanzoom, cyContextMenus,
			cyCola, cyDagre, /*cyCose,*/
			ContainerActionBar, ActionBar, ItemDetailPanel, InteractionOps, saveAs, PathJoin,
			PerspectiveToolTip, SelectionToGroup){

	var panelSubGraph = ['<div class="wsActionTooltip" rel="5">5 or More Nodes</div>', '<div class="wsActionTooltip" rel="10">10 or More Nodes</div>', '<div class="wsActionTooltip" rel="20">20 or More Nodes</div>', '<div class="wsActionTooltip" rel="max">Largest Subgraph</div>'].join("\n");

	var ttSubGraph = new TooltipDialog({
		content: panelSubGraph,
		onMouseLeave: function(){
			popup.close(ttSubGraph);
		}
	});

	var panelHubProtein = ['<div class="wsActionTooltip" rel="3">3 or More Neighbors</div>', '<div class="wsActionTooltip" rel="4">4 or More Neighbors</div>', '<div class="wsActionTooltip" rel="5">5 or More Neighbors</div>', '<div class="wsActionTooltip" rel="10">10 or More Neighbors</div>', '<div class="wsActionTooltip" rel="max">Most Connected Hub</div>'].join("\n");

	var ttHubProtein = new TooltipDialog({
		content: panelHubProtein,
		onMouseLeave: function(){
			popup.close(ttHubProtein);
		}
	});

	var panelLayouts = ['<div class="wsActionTooltip" rel="cola">COLA</div>', '<div class="wsActionTooltip" rel="cose-bilkent">COSE Bilkent</div>', '<div class="wsActionTooltip" rel="dagre">Dagre</div>', '<div class="wsActionTooltip" rel="grid">Grid</div>', '<div class="wsActionTooltip" rel="random">Random</div>', '<div class="wsActionTooltip" rel="concentric">Concentric</div>', '<div class="wsActionTooltip" rel="circle">Circle</div>'].join("\n");

	var ttLayouts = new TooltipDialog({
		content: panelLayouts,
		onMouseLeave: function(){
			popup.close(ttLayouts);
		}
	});

	var vfc = '<div class="wsActionTooltip" rel="dna">View FASTA DNA</div><div class="wsActionTooltip" rel="protein">View FASTA Proteins</div>';
	var viewFASTATT = new TooltipDialog({
		content: vfc, onMouseLeave: function(){
			popup.close(viewFASTATT);
		}
	});

	on(viewFASTATT.domNode, "click", function(evt){
		var rel = evt.target.attributes.rel.value;
		var sel = viewFASTATT.selection;
		delete viewFASTATT.selection;
		var idType;

		Topic.publish("/navigate", {
			href: "/view/FASTA/" + rel + "/?in(feature_id,(" + sel.join(",") + "))",
			target: "blank"
		});
	});

	// register modules
	if(typeof cytoscape('core', 'panzoom') !== 'function'){
		cyPanzoom(cytoscape, $);
	}

	return declare([BorderContainer], {
		gutters: false,
		visible: false,
		selection: null,
		containerType: "interaction_data",
		containerActions: [
			[
				"Legend",
				"fa icon-bars fa-2x",
				{
					label: "Legend",
					multiple: false,
					validType: ["*"]
				},
				function(){
					console.log("legend");
				},
				true
			], [
				"Export",
				"fa icon-print fa-2x",
				{
					label: "Export",
					multiple: false,
					validType: ["*"]
				},
				function(){
					// TODO: later change to svg
					// https://github.com/cytoscape/cytoscape.js/issues/639
					function fixBinary(bin){
						var length = bin.length;
						var buf = new ArrayBuffer(length);
						var arr = new Uint8Array(buf);
						for(var i = 0; i < length; i++){
							arr[i] = bin.charCodeAt(i);
						}
						return buf;
					}

					var png64 = this.cy.png({full: true, scale: 1.0}).split(',')[1];
					var binary = fixBinary(atob(png64));
					saveAs(new Blob([binary], {type: 'image/png'}), "PATRIC_interaction.png");
				},
				true
			], [
				"SubGraph",
				"fa icon-subtree fa-2x",
				{
					label: "Sub-Graph",
					multiple: false,
					validType: ["*"],
					tooltipDialog: ttSubGraph
				},
				function(){

					on(ttSubGraph.domNode, "click", lang.hitch(this, function(evt){
						var rel = evt.target.attributes.rel.value;
						var cy = this.cy;

						cy.elements().unselect();

						var selected = getSubGraphs(cy, rel);
						// console.log("selected: ", selected.length);
						cy.collection(selected).select();
					}));

					popup.open({
						popup: this.containerActionBar._actions.SubGraph.options.tooltipDialog,
						around: this.containerActionBar._actions.SubGraph.button,
						orient: ["below"]
					});
				},
				true
			], [
				"HubProtein",
				"fa icon-hub fa-2x",
				{
					label: "Hub Protein",
					multiple: false,
					validType: ["*"],
					tooltipDialog: ttHubProtein
				},
				function(){

					on(ttHubProtein.domNode, "click", lang.hitch(this, function(evt){
						var rel = evt.target.attributes.rel.value;
						var cy = this.cy;

						cy.elements().unselect();

						var selected = getHubs(cy, rel);
						// console.log("selected: ", selected.length);
						cy.collection(selected).select();
					}));

					popup.open({
						popup: this.containerActionBar._actions.HubProtein.options.tooltipDialog,
						around: this.containerActionBar._actions.HubProtein.button,
						orient: ["below"]
					});
				},
				true
			], [
				"Layouts",
				"fa icon-layout fa-2x",
				{
					label: "Layout",
					multiple: false,
					validType: ["*"],
					tooltipDialog: ttLayouts
				},
				function(){
					on(ttLayouts.domNode, "click", lang.hitch(this, function(evt){
						var rel = evt.target.attributes.rel.value;
						var cy = this.cy;

						switch(rel){
							case "cola":
								cy.layout({name: 'cola', userConstIter: 1});
								break;
							default:
								cy.layout({name: rel});
								break;
						}
					}));

					popup.open({
						popup: this.containerActionBar._actions.Layouts.options.tooltipDialog,
						around: this.containerActionBar._actions.Layouts.button,
						orient: ["below"]
					});
				},
				true
			]
		],
		selectionActions: [
			[
				"ToggleItemDetail",
				"fa icon-chevron-circle-right fa-2x",
				{
					label: "HIDE",
					persistent: true,
					validTypes: ["*"],
					tooltip: "Toggle Details Pane"
				},
				function(selection, container, button){
					var children = this.getChildren();
					if(children.some(function(child){
							return this.itemDetailPanel && (child.id == this.itemDetailPanel.id);
						}, this)){

						this.removeChild(this.itemDetailPanel);

						query(".ActionButtonText", button).forEach(function(node){
							node.innerHTML = "SHOW";
						});

						query(".ActionButton", button).forEach(function(node){
							domClass.remove(node, "icon-chevron-circle-right");
							domClass.add(node, "icon-chevron-circle-left");
						})
					}
					else{
						this.addChild(this.itemDetailPanel);

						query(".ActionButtonText", button).forEach(function(node){
							node.innerHTML = "HIDE";
						});

						query(".ActionButton", button).forEach(function(node){
							domClass.remove(node, "icon-chevron-circle-left");
							domClass.add(node, "icon-chevron-circle-right");
						})
					}
				},
				true
			],
			[
				"DownloadSelection",
				"fa icon-download fa-2x",
				{
					label: "DWNLD",
					multiple: true,
					validTypes: ["*"]
				},
				function(selection, container){
					console.log(selection);
				},
				false
			],
			[
				"ViewFeatureItem",
				"MultiButton fa icon-selection-Feature fa-2x",
				{
					label: "FEATURE",
					validTypes: ["*"],
					multiple: false,
					tooltip: "Switch to Feature View. Press and Hold for more options.",
					validContainerTypes: ["interaction_data"],
					pressAndHold: function(selection, button, opts, evt){
						// TODO: check whether selection[0] is protein
						popup.open({
							popup: new PerspectiveToolTip({
								perspective: "Feature",
								perspectiveUrl: "/view/Feature/" + selection[0].feature_id
							}),
							around: button,
							orient: ["below"]
						});
					}
				},
				function(selection){
					var sel = selection[0];

					if(sel.isNode() && sel.data('node_type') === 'genome_feature'){

						Topic.publish("/navigate", {
							href: "/view/Feature/" + sel.data('id') + "#view_tab=overview",
							target: "blank"
						});

					}else{
						var feature_ids = [sel.data('source'), sel.data('target')];

						Topic.publish("/navigate", {
							href: "/view/FeatureList/?in(feature_id,(" + feature_ids.join(",") + "))#view_tab=features",
							target: "blank"
						});
					}
				},
				false
			],
			[
				"ViewFeatureItems",
				"MultiButton fa icon-selection-FeatureList fa-2x",
				{
					label: "FEATURES",
					validTypes: ["*"],
					multiple: true,
					min: 2,
					max: 5000,
					validContainerTypes: ["interaction_data"]
				},
				function(selection){
					// console.log(selection);
					var sel = selection.filter(function(i, ele){
						return ele.isNode() && ele.data('node_type') === 'genome_feature';
					}).map(function(ele){
						return ele.data('id'); // feature_id
					});

					Topic.publish("/navigate", {
						href: "/view/FeatureList/?in(feature_id,(" + sel.join(",") + "))#view_tab=features",
						target: "blank"
					});
				},
				false
			],
			[
				"ViewFASTA",
				"fa icon-fasta fa-2x",
				{
					label: "FASTA",
					ignoreDataType: true,
					multiple: true,
					validTypes: ["*"],
					max: 5000,
					tooltip: "View FASTA Data",
					tooltipDialog: viewFASTATT,
					validContainerTypes: ["interaction_data"]
				},
				function(selection){

					var sel = selection.filter(function(i, ele){
						return ele.isNode() && ele.data('node_type') === 'genome_feature';
					}).map(function(ele){
						return ele.data('id'); // feature_id
					});

					viewFASTATT.selection = sel;

					popup.open({
						popup: this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog,
						around: this.selectionActionBar._actions.ViewFASTA.button,
						orient: ["below"]
					});
				},
				false
			], [
				"MultipleSeqAlignmentFeatures",
				"fa icon-alignment fa-2x",
				{
					label: "MSA",
					ignoreDataType: true,
					min: 2,
					multiple: true,
					max: 200,
					validTypes: ["*"],
					tooltip: "Multiple Sequence Alignment",
					validContainerTypes: ["interaction_data"]
				},
				function(selection){

					var sel = selection.filter(function(i, ele){
						return ele.isNode() && ele.data('node_type') === 'genome_feature';
					}).map(function(ele){
						return ele.data('id'); // feature_id
					});

					Topic.publish("/navigate", {
						href: "/view/MSA/?in(feature_id,(" + sel.join(",") + "))",
						target: "blank"
					});
				},
				false
			],
			[
				"AddGroup",
				"fa icon-object-group fa-2x",
				{
					label: "GROUP",
					ignoreDataType: true,
					multiple: true,
					validTypes: ["*"],
					requireAuth: true,
					max: 10000,
					tooltip: "Copy selection to a new or existing group",
					validContainerTypes: ["interaction_data"]
				},
				function(selection, containerWidget){

					var sel = selection.filter(function(i, ele){
						return ele.isNode() && ele.data('node_type') === 'genome_feature';
					}).map(function(ele){
						return {feature_id: ele.data('id')};
					});

					// console.log("Add Items to Group", sel);
					var dlg = new Dialog({title: "Copy Selection to Group"});
					var type = "feature_group";

					var stg = new SelectionToGroup({
						selection: sel,
						type: type,
						path: containerWidget.get("path")
					});
					on(dlg.domNode, "dialogAction", function(evt){
						dlg.hide();
						setTimeout(function(){
							dlg.destroy();
						}, 2000);
					});
					domConstruct.place(stg.domNode, dlg.containerNode, "first");
					stg.startup();
					dlg.startup();
					dlg.show();
				},
				false
			]
		],
		constructor: function(options){

			this.topicId = options.topicId;
			Topic.subscribe(this.topicId, lang.hitch(this, function(){
				var key = arguments[0], value = arguments[1];

				switch(key){
					case "updateGraphData":
						this.updateGraph(value);
						break;
					default:
						break;
				}
			}));

			this.watch("selection", lang.hitch(this, "onSelection"));
		},

		_setVisibleAttr: function(visible){
			this.visible = visible;

			if(this.visible && !this._firstView){
				this.onFirstView();

				var cy = this.cy = cytoscape({
					container: document.getElementById('cy'),
					boxSelectionEnabled: true,
					style: [
						{
							selector: 'node',
							style: {
								label: 'data(name)',
								'text-opacity': 0.8,
								'text-valign': 'center',
								'text-halign': 'center',
								'font-size': 10,
								width: 40,
								height: 40,
								// border
								'border-color': '#424242',
								'border-width': 2,
								'border-opacity': 0.8,
								// background
								'background-color': '#99CCFF'
							}
						}, {
							selector: 'node:selected',
							style: {
								'border-color': '#BBBB55',
								'shadow-color': '#FFAB00',
								'shadow-blur': 30,
								'shadow-opacity': 1
							}
						}, {
							selector: 'node.center',
							style: {
								label: 'data(gene)',
								width: 30,
								height: 30,
								'font-size': 15,
								'background-color': '#F44336'
							}
						}, {
							selector: 'edge',
							style: {
								width: 4,
								'line-color': '#555555',
								'curve-style': 'bezier'
							}
						}, {
							selector: 'edge:selected',
							style: {
								'line-color': '#BBBB55',
								'shadow-color': '#FFAB00', // a700
								'shadow-blur': 30,
								'shadow-opacity': 1
							}
						}, {
							selector: 'edge.typeA',
							style: {
								'line-color': '#3F51B5' // indigo 500
							}
						}, {
							selector: 'edge.typeB',
							style: {
								'line-color': '#009688', // teal 500
								'line-style': 'dotted'
							}
						}, {
							selector: 'edge.typeC',
							style: {
								'line-color': '#FF5722', // deep orange 500
								'line-style': 'dashed',
								'opacity': 0.6
							}
						}, {
							selector: 'edge.typeD',
							style: {
								'line-color': '#8D6E63', // brown 400
								'line-style': 'dotted'
							}
						}, {
							selector: 'edge.typeE',
							style: {
								'line-color': '#1B5E20', // green 900
								'line-style': 'dashed'
							}
						}
					]
				});

				// cy.panzoom();

				cy.contextMenus({
					menuItems: [{
						// 	id: 'highlight',
						// 	title: 'highlight',
						// 	selector: 'node',
						// 	onClickFunction: function(event){
						// 		console.log(event);
						// 	},
						// 	hasTrailingDivider: true
						// }, {
						id: 'selectNeighborhood',
						title: 'select Neighborhood',
						selector: 'node',
						onClickFunction: function(evt){
							cy.nodes().unselect();

							var rootNode = evt.cyTarget;
							rootNode.neighborhood().select();
						}
					}, {
						id: 'selectSubgraph',
						title: 'select Connected Sub-graph',
						selector: 'node',
						onClickFunction: function(evt){
							cy.nodes().unselect();

							var rootNode = evt.cyTarget;
							var visitedArr = [rootNode];
							cy.elements().bfs({
								roots: rootNode,
								visit: function(i, depth, v, e, u){
									visitedArr.push(v); // include node
									visitedArr.push(e); // include edge
								},
								directed: false
							});

							cy.collection(visitedArr).select();
						}
					}]
				});

				var tooltipDiv = query("div.tooltip");
				if(tooltipDiv.length == 0){
					// this.tooltipLayer = domConstruct.place('<div class="tooltip" style="opacity: 0"></div>', query("body")[0], "last");
					this.tooltipLayer = domConstruct.create("div", {
						"class": "tooltip",
						style: {opacity: 0}
					}, query("body")[0], "last");
				}else{
					this.tooltipLayer = tooltipDiv[0];
				}

				var self = this;

				cy.on('mouseover', 'node, edge', function(evt){
					// cy.on('tap', 'node, edge', function(evt){
					var ele = evt.cyTarget;

					var content = [];
					if(ele.isNode()){
						ele.data('id') ? content.push("PATRIC ID: " + ele.data('id')) : {};
						ele.data('refseq_locus_tag') ? content.push("RefSeq Locus Tag: " + ele.data('refseq_locus_tag')) : {};
						ele.data('gene') ? content.push("Gene: " + ele.data('gene')) : {};
						ele.data('product') ? content.push("Product: " + ele.data('product')) : {};

					}else if(ele.isEdge()){
						content.push("Interaction Type: " + ele.data('interaction_type'));
						content.push("Detection Method: " + ele.data('detection_method'));
					}

					// console.log(evt, self.tooltipLayer);

					domStyle.set(self.tooltipLayer, "left", evt.originalEvent.x + "px");
					domStyle.set(self.tooltipLayer, "top", evt.originalEvent.y + "px");
					domStyle.set(self.tooltipLayer, "opacity", 0.95);
					self.tooltipLayer.innerHTML = content.join("<br>");

				});
				cy.on('mouseout', 'node, edge', function(evt){
					domStyle.set(self.tooltipLayer, "opacity", 0);
				});
				var cySelection;
				cy.on('select unselect', 'node, edge', function(evt){
					clearTimeout(cySelection);
					cySelection = setTimeout(function(){
						var selected = evt.cy.elements(":selected");
						// console.log(selected);
						self.set("selection", selected);
					}, 300);
				})
			}
		},
		onFirstView: function(){
			if(this._firstView){
				return;
			}

			// action buttons
			this.containerActionBar = new ContainerActionBar({
				baseClass: "BrowserHeader",
				region: "top"
			});
			this.containerActions.forEach(function(a){
				this.containerActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4]);
			}, this);
			this.addChild(this.containerActionBar);

			this.addChild(new ContentPane({
				region: "center",
				id: "cy",
				// content: "<div id='cy'></div>",
				style: "padding:0"
			}));

			this.selectionActionBar = new ActionBar({
				region: "right",
				layoutPriority: 4,
				style: "width:56px;text-align:center;",
				splitter: false,
				currentContainerWidget: this
			});
			this.selectionActions.forEach(function(a){
				this.selectionActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4], a[5]);
			}, this);

			this.itemDetailPanel = new ItemDetailPanel({
				region: "right",
				style: "width:250px",
				minSize: 150,
				layoutPriority: 3,
				containerWidget: this
			});

			this.addChild(this.selectionActionBar);
			this.addChild(this.itemDetailPanel);

			this.inherited(arguments);
			this._firstView = true;
		},
		onSelection: function(){

			if(this.selection.length == 1){

				var cur = this.selection[0];
				if(cur.isNode()){
					// node // TODO: check whether this is protein as well

					var feature_id = cur.data('id');
					request.get(PathJoin(window.App.dataAPI, "genome_feature", feature_id), {
						headers: {
							accept: "application/json"
						},
						handleAs: "json"
					}).then(lang.hitch(this, function(feature){
						this.selectionActionBar.set('selection', [cur]);
						this.itemDetailPanel.set('selection', [feature])
					}))
				}else{
					// edge
					this.selectionActionBar.set("selection", [cur]);
					this.itemDetailPanel.set('selection', [cur.data()]);
				}
			}else{
				/*
					var isPureNodes = this.selection.every(function(s){
						return s.isNode();
					});

					var sel;
					if(isPureNodes){
						sel = this.selection.map(function(s){
							return lang.mixin(s.data(), {
								feature_id: s.data('id')
							})
						});
					}else{
						sel = this.selection.map(function(s){
							return s.data();
						});
					}

					console.log(sel, isPureNodes);

					if(isPureNodes){
						this.selectionActionBar.set('currentContainerWidget', {containerType: "feature_data"});
					}else{
						this.selectionActionBar.set('currentContainerWidget', this);
					}
					this.selectionActionBar.set("selection", sel);
					this.itemDetailPanel.set("selection", sel);
				*/
				this.selectionActionBar.set("selection", this.selection);
				this.itemDetailPanel.set("selection", this.selection);
			}
		},
		updateGraph: function(data){
			if(data.length == 0){
				return;
			}
			var cy = this.cy;
			cy.elements().remove();

			cy.batch(function(){
				data.forEach(function(d){
					var i_a = d.feature_id_a;
					var i_b = d.feature_id_b;

					if(cy.getElementById(i_a).empty()){
						cy.add(createInteractorCyEle(d, 'a'));
					}
					if(cy.getElementById(i_b).empty()){
						cy.add(createInteractorCyEle(d, 'b'));
					}

					var edgeClass;
					switch(d['detection_method']){
						case "experimental interaction detection":
							edgeClass = "typeA";
							break;
						case "predictive text mining":
							edgeClass = "typeB";
							break;
						case "inference":
							edgeClass = "typeC";
							break;
						case "phylogenetic profile":
							edgeClass = "typeD";
							break;
						case "gene neighbourhood":
							edgeClass = "typeE";
							break;
						default:
							edgeClass = "";
							break;
					}

					cy.add({
						data: {
							id: d['id'],
							source: i_a,
							target: i_b,
							interaction_type: d['interaction_type'],
							detection_method: d['detection_method']
						},
						classes: edgeClass
					})
				});
			});

			// cy.layout({name: 'circle'});
			cy.layout({name: 'cola', userConstIter: 1});
		}
	})
});