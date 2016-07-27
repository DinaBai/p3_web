define("p3/widget/viewer/FASTA", [
	"dojo/_base/declare", "dijit/layout/ContentPane", "./Base",
	"dojo/request/xhr", "../../util/PathJoin","dojo/when"
], function(declare, ContentPane, Base,
			Request, PathJoin, when){
	return declare([Base], {
		dataModel: "genome_feature",
		limit: 25000,
		onSetState: function(attr, oldVal, state){
			var parts = state.pathname.split("/");
			var type = "dna";
			if(parts && (parts.length > 2) && parts[parts.length - 2]){
				var type = parts[parts.length - 2];
			}

			if(!state.search){
				console.log("NO STATE");
				return;
			}
			var query = state.search;

			if (this.contentPanel){
				this.contentPanel.set("content", "Loading FASTA Data...");
			}
			var _self=this;

			when(this.getData(type, query), function(data){
				// console.log("Got FASTA Data");
				_self.contentPanel.set("content", data);
			}, function(err){
				_self.contentPanel.set("content", "There was an error retrieving the requested data: " + err);
			})
		},

		getData: function(type,query){


			// console.log("Query Data Length: ", query.length);

			query = query + "&limit(" + this.limit + ")";
			url = PathJoin(this.apiServiceUrl, this.dataModel) + "/"
			// console.log("FASTA getData POST URL: ", url);
			// console.log("POST DATA: ", query);
			var _self=this;
			
			return Request.post(url, {
				method: "post",
				headers: {
				 "Content-Type": "application/rqlquery+x-www-form-urlencoded",
				 "accept": "application/" + type + "+fasta",
				 'authorization': (window.App.authorizationToken || ""),
				 'X-Requested-With': null
				},		 
                'X-Requested-With': null,
				data: query
			})
		},

		startup: function(){
			var query;
			if(this._started){
				return;
			}
			if(this.state && this.state.search){
				query = this.state.search;
				var parts = this.state.pathname.split("/");
				var type = "dna";
				if(parts && (parts.length > 2) && parts[parts.length - 2]){
					var type = parts[parts.length - 2];
				}
				// query = query + "&http_accept=application/" + type + "+fasta&limit(" + this.limit + ")";
				// query = PathJoin(this.apiServiceUrl, this.dataModel, "?" + query);
			}

			this.header = new ContentPane({
				content: '<div style="padding: 4px;text-align:right;border:1px solid #ddd;"><i class="fa icon-download fa-2x"></i></div>',
				region: "top",
				style: "padding:4px;"
			});

			this.contentPanel = new ContentPane({
				region: "center",
				// href: (query ? query : ""),
				content: "Loading FASTA Data...",
				style: "word-wrap:break-word;font-family:monospace;white-space:pre;margin:1em;font-size:1.1em;"
			});
			this.addChild(this.header);
			this.addChild(this.contentPanel);

			this.inherited(arguments);

			if (this.state){
				this.onSetState("state",this.state,this.state);
			}
		}
	})
});