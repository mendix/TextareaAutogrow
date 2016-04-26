/*global logger*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",

    "mxui/dom",
    "dojo/dom",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/_base/event",

    "dojo/text!TextareaAutogrow/widget/template/TextareaAutogrow.html"
], function(declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoArray, dojoLang, dojoText, dojoHtml, dojoEvent, widgetTemplate) {
    "use strict";

    // Declare widget's prototype.
    return declare("TextareaAutogrow.widget.TextareaAutogrow", [ _WidgetBase, _TemplatedMixin ], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // Parameters configured in the Modeler.
        mfToExecute: "",

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        _alertDiv: null,
        base : 4,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function() {
            // Uncomment the following line to enable debug messages
            //logger.level(logger.DEBUG);
            logger.debug(this.id + ".constructor");
            this._handles = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function() {
            logger.debug(this.id + ".postCreate");
            this.lineSize = parseInt(dojoStyle.get(this.textAreaNode, 'lineHeight'), 10) || 15;
            this._updateRendering();
            this._setupEvents();
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function(obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            this._resetSubscriptions();
            this._updateRendering();

            callback();
        },

        // Attach events to HTML dom elements
        _setupEvents: function() {
            this.connect(this.textAreaNode, 'change', dojoLang.hitch(this, this.textChange));
		    this.connect(this.textAreaNode, 'keyup', dojoLang.hitch(this, this.textChange));
        },

        textChange : function (e) {
            this.getHeight();
            
            if (e.type == 'change' || this.onchangemf) {
                if (this._prevValue == null || this._prevValue != this.textAreaNode.value) {
                    this._contextObj.set(this.name, this.textAreaNode.value);

                    if (this.onchangemf) 
                        setTimeout(dojoLang.hitch(this, this.executeMF), 1); //MWE: @#$@%^@SDF this delay solves the missing charaters problem, but dunno why....
                }
            }
        },

        mfrunning : false,
        mfrunningprev : 0,
        executeMF : function() {

            // If a microflow has been set execute the microflow on a click.
            if (this.onchangemf !== "") {
                
                if (this.mfrunning)
                    return; //skip the onchange
                if ((+ new Date) - 500 < this.mfrunningprev)
                    return; //do not run too often...
                
                mx.data.action({
                    params: {
                        applyto: "selection",
                        actionname: this.onchangemf,
                        guids: [ this._contextObj.getGuid() ]
                    },
                    store: {
                        caller: this.mxform
                    },
                    callback: dojoLang.hitch(this, function(obj) {
                        this.mfrunning = false;
                        this.mfrunningprev = (+ new Date);        
                    }),
                    error: dojoLang.hitch(this, function(error) {
                        logger.error(this.id + ": An error occurred while executing microflow: " + error.description);
                    })
                }, this);
            }
        },

	   getHeight : function () {
            // if (dojo.marginBox(this.textAreaNode).w == 0)
            //     return;
            
            dojoStyle.set(this.secretTA, {
                'width' :  (dojoGeometry.getMarginBox(this.textAreaNode).w-5)+'px',
                'paddingTop' : dojoStyle.get(this.textAreaNode, 'paddingTop'),
                'paddingLeft' : dojoStyle.get(this.textAreaNode, 'paddingLeft'),
                'paddingRight' : dojoStyle.get(this.textAreaNode, 'paddingRight'),
                'paddingBottom' : dojoStyle.get(this.textAreaNode, 'paddingBottom'),
                'fontSize' : dojoStyle.get(this.textAreaNode, 'fontSize'),
                'fontFamily' : dojoStyle.get(this.textAreaNode, 'fontFamily'),
                'fontWeight' : dojoStyle.get(this.textAreaNode, 'fontWeight'),
                'lineHeight' : (dojoStyle.get(this.textAreaNode, 'lineHeight') || 15)+'px',
                'textAlign' : dojoStyle.get(this.textAreaNode, 'textAlign')
            });
            
            var secretText = this.textAreaNode.value.replace(/\n/gi, "<br />");
            this.secretTA.innerHTML = secretText+"<br />";
            dojoStyle.set(this.secretTA, 'height', 'auto');
            
            var placeholder = dojoGeometry.getMarginBox(this.secretTA).h; // Chrome bug with first read.
            var secretHeight = dojoGeometry.getMarginBox(this.secretTA).h;
            var newH = secretHeight+this.base;
            var min = (this.minSize*this.lineSize)+this.base;
            var max = (this.maxSize*this.lineSize)+this.base;
            
            if (newH < min) {
                dojoStyle.set(this.textAreaNode, {
                    'height' : min+'px',
                    'overflow' : 'hidden'
                });
            } else if (this.maxSize > 0 && newH > max) {
                dojoStyle.set(this.textAreaNode, {
                    'height' : max+'px',
                    'overflow' : 'auto'
                });
            } else {
                dojoStyle.set(this.textAreaNode, {
                    'height' : newH+'px',
                    'overflow' : 'hidden'
                });
            }
        },


        // Rerender the interface.
        _updateRendering: function() {
            logger.debug(this.id + "._updateRendering");
            this.textAreaNode.disabled = this.readOnly;

            if (this._contextObj !== null) {
                dojoStyle.set(this.domNode, "display", "block");

                var textValue = this._contextObj.get(this.name);

                this.textAreaNode.value = textValue;
            } else {
                dojoStyle.set(this.domNode, "display", "none");
            }

            // Important to clear all validations!
            this._clearValidations();
        },

        // Handle validations.
        _handleValidation: function(validations) {
            logger.debug(this.id + "._handleValidation");
            this._clearValidations();

            var validation = validations[0],
                message = validation.getReasonByAttribute(this.name);

            if (this.readOnly) {
                validation.removeAttribute(this.name);
            } else if (message) {
                this._addValidation(message);
                validation.removeAttribute(this.name);
            }
        },

        // Clear validations.
        _clearValidations: function() {
            logger.debug(this.id + "._clearValidations");
            dojoConstruct.destroy(this._alertDiv);
            this._alertDiv = null;
        },

        // Show an error message.
        _showError: function(message) {
            logger.debug(this.id + "._showError");
            if (this._alertDiv !== null) {
                dojoHtml.set(this._alertDiv, message);
                return true;
            }
            this._alertDiv = dojoConstruct.create("div", {
                "class": "alert alert-danger",
                "innerHTML": message
            });
            dojoConstruct.place(this.domNode, this._alertDiv);
        },

        // Add a validation.
        _addValidation: function(message) {
            logger.debug(this.id + "._addValidation");
            this._showError(message);
        },

        // Reset subscriptions.
        _resetSubscriptions: function() {
            logger.debug(this.id + "._resetSubscriptions");
            // Release handles on previous object, if any.
            if (this._handles) {
                dojoArray.forEach(this._handles, function (handle) {
                    mx.data.unsubscribe(handle);
                });
                this._handles = [];
            }

            // When a mendix object exists create subscribtions.
            if (this._contextObj) {
                var objectHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: dojoLang.hitch(this, function(guid) {
                        this._updateRendering();
                    })
                });

                var attrHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    attr: this.name,
                    callback: dojoLang.hitch(this, function(guid, attr, attrValue) {
                        this._updateRendering();
                    })
                });

                var validationHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: dojoLang.hitch(this, this._handleValidation)
                });

                this._handles = [ objectHandle, attrHandle, validationHandle ];
            }
        }
    });
});

require(["TextareaAutogrow/widget/TextareaAutogrow"], function() {
    "use strict";
});
