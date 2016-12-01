define([
	"dojo/_base/declare", "dojo/when",
	"./GenomeGridContainer", "./Confirmation", "../WorkspaceManager"
], function(declare, when,
			GenomeGridContainer, Confirmation, WorkspaceManager){

	return declare([GenomeGridContainer], {
		selectionActions: GenomeGridContainer.prototype.selectionActions.concat([
			[
				"RemoveItem",
				"fa icon-x fa-2x",
				{
					label: "REMOVE",
					ignoreDataType: true,
					multiple: true,
					validTypes: ["*"],
					tooltip: "Remove Selection from Group"
				},
				function(selection){
					// console.log("Remove Items from Group", selection);
					// console.log("currentContainerWidget: ", this.currentContainerWidget);

					var idType = "genome_id";
					var type = "genome";
					var objs = selection.map(function(s){
						// console.log('s: ', s, s.data);
						return s[idType];
					});

					var conf = "Are you sure you want to remove " + objs.length + " " + type +
						((objs.length > 1) ? "s" : "") +
						" from this group?";
					var _self = this;
					var dlg = new Confirmation({
						content: conf,
						onConfirm: function(evt){
							console.log("remove items from group, ", objs, _self.state);
							when(WorkspaceManager.removeFromGroup(_self.state.ws_path, idType, objs), function(){
								_self.grid.refresh();
							});
						}
					});
					dlg.startup();
					dlg.show();

				}
			]
		])

	})

})