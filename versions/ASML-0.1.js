var ASML = function(content){
	var isDef = function(prm){ return typeof prm !== 'undefined'; };

	var loadContent = function(){
		var style = document.createElement("style");
		style.innerHTML = "a > img { border: 0px; }</style>";
		document.body.appendChild(style);
		asml.viewPort = (function(){
			var self = this;
			var pvar = p(self);
			document.body.removeChild(pvar.element);

			this.fill = function(){
				return null;
			};
			this.offset = function(){
				var l = affectedChange.length;
				if(l){
					affectedChange[l-1].ifThis.push([window, "scroll"]);
					affectedChange[l-1].ifThis.push([window, "resize"]);
				}
				return {
					l: function(){ return window.pageXOffset; },
					r: function(){ return -window.pageXOffset; },
					b: function(){ return -window.pageYOffset; },
					t: function(){ return window.pageYOffset; },
				}
			};
			this.size = function(){
				var l = affectedChange.length;
				if(l){
					affectedChange[l-1].ifThis.push([window, "resize"]);
				}
				return {
					x: function(){ return window.innerWidth; },
					y: function(){ return window.innerHeight; },
				}
			}
			this.parent = function(){
				return null;
			}

			return this;
		}).apply(new create (document.createElement('div') ));

		content(function(prm){ return new create(document.createElement('div'), prm); }, asml);

		var ev = document.createEvent('CustomEvent');
		ev.initCustomEvent("resize", false, false, null);
		window.dispatchEvent(ev);
	};

	var p = function(obj){ return private[obj.ID]; };

	var private = []
	var asml = this;
	var attrs = ["Fill", "OffsetL", "OffsetR", "OffsetB", "OffsetT", "Children", "Parent"];
	var affectedChange = [];

	var create = function(element, prm){

		this.ID = private.length;

		private.push({
			change: {},
			element: element,
			parent: null,
			children: [],
		});

		var self = this;
		var pvar = p(self);

		var handleParam = function(prm, changeName, setAttr){
			var attrChange = pvar.change[changeName];
			// Defined "prm" means there is a new value to set, causing a change event
			// Undefined "prm" means 
			if(isDef(prm)){

				// Remove prior listeners from the change event
				for(var i = 0; i < attrChange.ifThis.length; i++){
					var arg = attrChange.ifThis[i];
					arg[0].removeEventListener(arg[1], attrChange.doThis);
				}

				attrChange.ifThis = [];
				
				// Set latest affected change to this change
				affectedChange.push(attrChange);
				// Run the task to find dependent change events to listen to
				setAttr( typeof prm == "function" ? prm.apply(self) : prm );
				// Remove this change from top of the "affected change" list
				affectedChange.pop();				
				// Alert event listeners that this attributes value has changed
				var ev = document.createEvent('CustomEvent');
				ev.initCustomEvent("change"+changeName, false, false, null);
				element.dispatchEvent(ev);

				//element.dispatchEvent(new Event("change" + changeName));

				// The listener task must be run through handleParam again to catch listeners for its next change event
				attrChange.doThis = function(){ handleParam(prm, changeName, setAttr); }

				// Assign new listeners under the new change task
				for(var i = 0; i < attrChange.ifThis.length; i++){
					var arg = attrChange.ifThis[i];
					arg[0].addEventListener(arg[1], attrChange.doThis);
				}

				return true;

			} else {
				var l = affectedChange.length;
				if(l && affectedChange[l-1] != attrChange){
					affectedChange[l-1].ifThis.push([element, "change" + changeName]);
				}
				return false;
			}
		};
		this.toString = function(){
			return self.ID;
		};
		this.fill = function(prm){
			var setAttr = function(prm){
				element.innerHTML = "";
				switch(typeof prm){
					case "string":
						element.innerHTML = prm;
						break;
					case "object":
						element.appendChild(prm);
						break;
				}
			};

			if(handleParam(prm, "Fill", setAttr)){
				return self;
			} else {
				return element.firstChild;
			}
		};
		this.offset = function(prm){
			if(!isDef(prm)){
				// All offsets have the same function but apply to different sides, hence the "side" parameter
				var doStandard = function(prm, side, abbr){
					var setAttr = function(prm){
						element.style[side] = (self.parent().offset()[abbr]() + prm) + "px";
					};

					if(handleParam(prm, "Offset" + abbr.toUpperCase(), setAttr)){
						return self;
					} else {
						return parseFloat(element.style[side]);
					}
				};

				return {
					l: function(prm){ return doStandard(prm, "left", "l"); },
					r: function(prm){ return doStandard(prm, "right", "r"); },
					b: function(prm){ return doStandard(prm, "bottom", "b"); },
					t: function(prm){ return doStandard(prm, "top", "t"); },
				};
			} else {
				switch(typeof prm){
					case "object":
						for(attr in prm){
							self.offset()[ attr ]( prm[ attr ] );
						}
						break;
				}

				return self;
			}
		};
		this.parent = function(prm){
			var setAttr = function(prm){
				if(pvar.parent){
					var i = pvar.parent.children().indexOf(self);
					if(i != -1){
						pvar.parent.children(i, 1);
					}
				}
				if(prm != pvar.parent){
					pvar.parent = prm;

					if(pvar.parent){
						if(pvar.parent.children().indexOf(self) == -1){
							pvar.parent.children(-1, 0, self);
						}
					}
				}
			}

			if(handleParam(prm, "Parent", setAttr)){
				return self;
			} else {
				if(pvar.parent){
					return pvar.parent;
				} else {
					return {
						offset: function(){
							return {
								l: function(){ return 0; },
								r: function(){ return 0; },
								b: function(){ return 0; },
								t: function(){ return 0; },
							};
						},
					};
				}
			}
		};
		this.children = function(index, remove, insert){
			// "prm" remains undefined unless a child is removed or inserted
			var prm;
			if( isDef(remove) ){
				if(!isDef(insert)){
					insert = [];
				}
				prm = [index, remove, insert];
			}

			var setAttr = function(prm){
				var index = prm[0];
				var remove = pvar.children.slice(index, prm[1] + index);
				var insert = prm[2];

				pvar.children.splice.apply(pvar.children, [index + i, remove].concat(insert));

				for(var i = 0; i < remove.length; i++){
					remove[i].parent(null)
				}
				if(isDef(insert)){
					for(var i = 0; i < insert.length; i++){
						insert[i].parent(self);
					}
				}
			}

			if(handleParam(prm, "Children", setAttr)){
				return self;
			} else {
				if(!isDef(index)){
					return pvar.children;
				} else {
					return pvar.children[index];
				}
			}
		};
		this.size = function(){
			return {
				x: function(){ return asml.viewPort.size().x() - self.offset().l() - self.offset().r(); },
				y: function(){ return asml.viewPort.size().y() - self.offset().b() - self.offset().t(); }
			};
		};
		this.appendEventTask = function(arg1, arg2){
			element.addEventListener(arg1, arg2, false);
			return this;
		};
		this.removeEventTask = function(arg1, arg2){
			element.removeEventListener(arg1, arg2, false);
			return this;
		};
		this.runEvent = function(arg1){
			element.dispatchEvent(arg1);
			return this;
		};

		for(var i = 0; i < attrs.length; i++){
			pvar.change[attrs[i]] = {
				doThis: null,
				ifThis: []
			};
		}
		// Default styling and attributes are set
		var es = element.style

		es.position = "absolute";
		es.overflow = "hidden";
		self.offset({ l: 0, r: 0, b: 0, t: 0 });
		es.zIndex = "0";
		document.body.appendChild(element);

		// Attributes from "prm" object are passed through "this" object
		if(typeof prm == "object"){
			for(attr in prm){
				self[ attr ]( prm[ attr ] );
			}
		}
	};

	if(document.body){
		loadContent();
	} else {
		window.addEventListener('load', loadContent, false);
	}
};