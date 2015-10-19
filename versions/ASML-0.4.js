var ASML = function(){
	var dispatchNewEvent = function(node, type){
		var ev = document.createEvent('CustomEvent');
		ev.initCustomEvent(type, false, false, null);
		return node.dispatchEvent(ev);
	}

	var isDef = function(prm){ return typeof prm !== 'undefined'; };

	var p = function(obj){ return private[obj.ID]; };

	var private = []
	var asml = this;
	var affectedChange = [];
	var childBuffer = [];
	var changeBuffer = [];

	var oWrapper = document.createElement('div');
	oWrapper.id = "ASMLWrapper"
	oWrapper.style.position = "absolute";
	oWrapper.style.left = "0px";
	oWrapper.style.right = "0px";
	oWrapper.style.bottom = "0px";
	oWrapper.style.top = "0px";
	oWrapper.style.overflow = "scroll";

	var iWrapper = document.createElement('div');
	iWrapper.style.position = "relative";
	iWrapper.style.width = "100%";
	iWrapper.style.height = "100%";
	iWrapper.style.overflow = "visible";

	oWrapper.appendChild(iWrapper);

	var style = document.createElement("style");
	style.innerHTML = "#ASMLWrapper a > img { border: 0px; }";
	oWrapper.appendChild(style);

	var ASMLElement = function(prm){

		this.ID = private.length;

		private.push({
			change: {Fill:0, OffsetL:0, OffsetR:0, OffsetB:0, OffsetT:0, OffsetZ:0, Children:0, Parent:0},
			element: document.createElement('div'),
			parent: null,
			children: [],
		});

		var self = this;
		var pvar = p(self);
		var element = pvar.element;

		var handleParam = function(prm, changeName, setAttr){
			var attrChange = pvar.change[changeName];
			var returnVal;
			var bufferdAction;
			// Defined "prm" means there is a new value to set, causing a change event
			// Undefined "prm" means 
			if(isDef(prm)){
				bufferedAction = function(){
					if(!attrChange.changing){
						attrChange.changing = true;

						// Remove previous effectors before attaching new ones
						for(var i = 0; i < attrChange.effectors.length; i++){
							var eff = attrChange.effectors[i].effectees;
							var index;
							while((index = eff.indexOf(attrChange)) != -1){
								eff.splice(index, 1);
							}
						}

						attrChange.effectors.splice(0, attrChange.effectors.length);

						// Set latest "affected change" to this change
						affectedChange.splice(0, 0, attrChange);
						
						// Look for new effectors
						setAttr( (typeof prm == "function") ? prm.apply(self) : prm );
										
						// Alert event listeners that this attributes value has changed
						dispatchNewEvent(element, "change"+changeName);

						// Remove this change from top of the "affected change" list
						affectedChange.splice(0, 1);

						// Alert existing effectees
						attrChange.effectees.slice(0,attrChange.effectees.length).forEach(function(effectee, i){
							effectee.doThis();
						});

						// The listener task must be run through handleParam again to catch listeners for its next change event
						attrChange.doThis = function(){ handleParam(prm, changeName, setAttr); };

						attrChange.changing = false;
					}
				};
				returnVal = true;
			} else {
				bufferedAction = function(){
					if(affectedChange[0] && affectedChange[0] != attrChange){
						affectedChange[0].effectors.splice(-1, 0, attrChange);
						attrChange.effectees.splice(-1, 0, affectedChange[0]);
					}
				};
				returnVal = false;
			}

			if(changeBuffer[0]){
				changeBuffer[0].push(bufferedAction);
			} else {
				bufferedAction();
			}
			
			return returnVal;
		};
		this.toString = function(){
			return "id: " + self.ID;
		};
		this.fill = function(prm){
			var setAttr = function(prm){
				if(prm != element.firstChild){
					element.innerHTML = "";
					switch(prm.constructor){
						case Array:
							asml.HTML([element, {}, [prm]]);
							break;
						case String:
							element.innerHTML = prm;
						default:
							element.appendChild(prm);
					}
				}
				
			};
			if(handleParam(prm, "Fill", setAttr)){
				return self;
			} else {
				return element.firstChild;
			}
		};
		this.offset = function(prm){
			if(isDef(prm)){
				switch(typeof prm){
					case "object":
						for(attr in prm){
							self.offset()[ attr ]( prm[ attr ] );
						}
						break;
				}

				return self;
			} else {
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
				var doZIndex = function(prm){
					var setAttr = function(prm){
						element.style.zIndex = (self.parent().offset().z() + prm) + "";
					};

					if(handleParam(prm, "OffsetZ", setAttr)){
						return self;
					} else {
						return parseInt(element.style.zIndex);
					}
				};

				return {
					l: function(prm){ return doStandard(prm, "left", "l"); },
					r: function(prm){ return doStandard(prm, "right", "r"); },
					b: function(prm){ return doStandard(prm, "bottom", "b"); },
					t: function(prm){ return doStandard(prm, "top", "t"); },
					z: function(prm){ return doZIndex(prm); },
				};
			}
		};
		this.parent = function(prm){
			var setAttr = function(prm){
				// only occurs if parent() is called before children()
				var index;
				if(pvar.parent != null && (index = p(pvar.parent).children.indexOf(self)) != -1){
					pvar.parent.children(index, 1, []);
				}

				pvar.parent = prm;

				if(pvar.parent != null && p(pvar.parent).children.indexOf(self) == -1){
					pvar.parent.children(-1, 0, [self]);
				}
			}

			if(handleParam(prm, "Parent", setAttr)){
				return self;
			} else {
				if(pvar.parent != null){
					return pvar.parent;
				} else {
					return {
						offset: function(){
							return {
								l: function(){ return 0; },
								r: function(){ return 0; },
								b: function(){ return 0; },
								t: function(){ return 0; },
								z: function(){ return 0; },
							};
						},
						size: function(){
							return asml.viewPort.size();
						},
					};
				}
			}
		};
		this.children = function(index, remove, insert){
			// "prm" remains undefined unless a child is removed or inserted
			var prm;
			var stopBuffer = false;

			if( isDef(remove) ){
				if(!isDef(insert)){
					insert = [];
				}
				prm = [index, remove, insert];
			}

			var setAttr = function(prm){
				var remove = pvar.children.slice(index, prm[1] + index);
				var insert = prm[2];

				pvar.children.splice.apply(pvar.children, [prm[0], prm[1]].concat(insert));

				for(var i = 0; i < remove.length; i++){
					if(p(remove[i]).parent != null){
						remove[i].parent(null);
					}
				}
				for(var i = 0; i < insert.length; i++){
					if(p(insert[i]).parent != self){
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
		this.childBuffer = function(bool){
			if(bool){
				childBuffer.splice(0,0,self);
			} else {
				childBuffer.splice(0,1);
			}

			return self;
		};
		this.render = function(prm){
			var setAttr = function(prm){
				if(prm){
					iWrapper.appendChild(element);
				} else {
					iWrapper.removeChild(element);
				}
			}

			if(handleParam(prm, "Render", setAttr)){
				return self;
			} else {
				return iWrapper == element.parent;
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
			dispatchNewEvent(element, arg1);
			return this;
		};

		// Create a change object for each ASML property
		for(i in pvar.change){
			pvar.change[i] = {
				doThis: function(){},
				effectors: [],
				effectees: [],
				changing: false,
				name: i + " change, object " + self.ID,
			};
		}

		// Default styling and attributes are set
		var es = element.style
		es.position = "absolute";
		es.overflow = "hidden";

		element.id = "ASML_" + self.ID;

		if(childBuffer.length){
			self.parent(childBuffer[0]);
		}

		element.appendChild(document.createElement('div'));
		self.offset({ l: 0, r: 0, b: 0, t: 0, z: 0 });
		
		iWrapper.appendChild(element);

		// Attributes from "prm" object are passed through "this" object
		if(typeof prm == "object"){
			for(attr in prm){
				self[ attr ]( prm[ attr ] );
			}
		}
	};

	this.Element = function(){
		return new ASMLElement(arguments[0], arguments[1]);
	};

	asml.viewPort = (function(){
		var self = this;
		var pvar = p(self);
		pvar.change.Size = { effectees: [] };

		var offsetWidth = 0;
		var offsetHeight = 0;

		this.offset().z(0);

		this.size = function(){
			if(affectedChange[0]){
				affectedChange[0].effectors.splice(-1, 0, pvar.change.Size);
				pvar.change.Size.effectees.splice(-1, 0, affectedChange[0]);
			}
			return {
				x: function(){ return offsetWidth; },
				y: function(){ return offsetHeight; },
			}
		};

		window.addEventListener('scroll', function(){
			self.offset({
				l: window.pageXOffset,
				r: -window.pageXOffset,
				b: -window.pageYOffset,
				t: window.pageYOffset,
			});
		}, false);
		window.addEventListener('resize', function(){

			offsetWidth = pvar.element.offsetWidth;
			offsetHeight = pvar.element.offsetHeight;

			var effectees = pvar.change.Size.effectees;
			effectees.slice(0, effectees.length).forEach(function(effectee){
				effectee.doThis();
			});

		}, false);

		return this;
	}).apply(new ASMLElement());

	var nsSource;

	this.HTML = function(prm){
		var element;
		var nsSetHere = false;
		function modify(){
			if(prm.length > 1){
				var attr = prm[1]
				for(a in attr){
					if(typeof attr[a] == "object"){
						var val = "";
						for(b in attr[a]){
							val += (b + ":" + attr[a][b] + ";");
						}
						attr[a] = val;
					}
					element.setAttribute(a, attr[a]);
				}
				if(prm.length > 2){
					switch(prm[2].constructor){
						case Array:
							var child = asml.HTML(prm[2]);
							for(var i = 0; i < child.length; i++){
								element.appendChild(child[i]);
							}
							break;
						case String:
							element.innerHTML = prm[2];
							break;
					}
				}
			}
		}
		switch(prm[0].constructor){
			case String:
				if(prm[0].toLowerCase() == "svg"){
					nsSource = "http://www.w3.org/2000/svg";
					nsSetHere = true;
				}
				if(nsSource){
					element = document.createElementNS(nsSource, prm[0]);
				} else {
					element = document.createElement(prm[0]);
				}
				modify();
				break;
			case Object:
				prm.splice(0,0,"div");
				element = asml.HTML(prm);
				break;
			case Array:
				element = [];
				for(var i = 0; i < prm.length; i++){
					element.push( asml.HTML(prm[i]) );
				}
				break;
			default: // case HTMLElement or descendent
				if(prm[0].constructor == SVGElement){
					nsSource = "http://www.w3.org/2000/svg";
					nsSetHere = true;
				}
				element = prm[0];
				modify();
				break;
		}
		if(nsSetHere){ nsSource = undefined; }
		return element;
	};

	this.Sequence = function(){
		this.prev = prev;
		this.value = value;
		this.next = next;
		this.remove = function(){
			
		};
		this.concat = function(subSequent){
			
		};
	};

	this.changeBuffer = function(prm){
		if(prm){
			changeBuffer.splice(0,0,[]);
		} else {
			var temp = changeBuffer[0].slice(0, changeBuffer[0].length);
			changeBuffer.splice(0,1);
			temp.forEach(function(change){
				change();
			});

			dispatchNewEvent(window, "resize");
		}
	};

	// Timeout is used rather window load listener in case ASML is instantiated after window has loaded
	var loadASAP = function(){
		if(document.body){
			document.body.appendChild(oWrapper);
			dispatchNewEvent(window, "resize");
		} else {
			window.setTimeout(loadASAP, 0);
		}
	};
	loadASAP();

	if(false){
		//	ONLY FOR DEBUGGING PURPOSES!!! //
		asml.p = p;
	}
};