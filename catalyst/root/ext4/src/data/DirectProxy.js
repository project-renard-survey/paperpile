/**
 * @class Ext.data.DirectProxy
 * @extends Ext.data.ServerProxy
 */
Ext.define('Ext.data.DirectProxy', {
    /* Begin Definitions */
    
    extend: 'Ext.data.ServerProxy',
    
    alias: 'proxy.direct',
    
    requires: ['Ext.direct.Manager'],
    
    /* End Definitions */
   
   /**
     * @cfg {Array/String} paramOrder Defaults to <tt>undefined</tt>. A list of params to be executed
     * server side.  Specify the params in the order in which they must be executed on the server-side
     * as either (1) an Array of String values, or (2) a String of params delimited by either whitespace,
     * comma, or pipe. For example,
     * any of the following would be acceptable:<pre><code>
paramOrder: ['param1','param2','param3']
paramOrder: 'param1 param2 param3'
paramOrder: 'param1,param2,param3'
paramOrder: 'param1|param2|param'
     </code></pre>
     */
    paramOrder: undefined,

    /**
     * @cfg {Boolean} paramsAsHash
     * Send parameters as a collection of named arguments (defaults to <tt>true</tt>). Providing a
     * <tt>{@link #paramOrder}</tt> nullifies this configuration.
     */
    paramsAsHash: true,

    /**
     * @cfg {Function} directFn
     * Function to call when executing a request.  directFn is a simple alternative to defining the api configuration-parameter
     * for Store's which will not implement a full CRUD api.
     */
    directFn : undefined,
    
    /**
     * @cfg {Object} api The same as {@link Ext.data.ServerProxy#api}, however instead of providing urls, you should provide a direct
     * function call.
     */
    
    constructor: function(config){
        var me = this;
        
        Ext.apply(me, config);
        if (Ext.isString(me.paramOrder)) {
            me.paramOrder = me.paramOrder.split(/[\s,|]/);
        }
        me.callParent(arguments);
    },
    
    doRequest: function(operation, callback, scope) {
        var me = this,
            writer = me.getWriter(),
            request = me.buildRequest(operation, callback, scope),
            fn = me.api[request.action]  || me.directFn,
            args = [],
            params = request.params,
            paramOrder = me.paramOrder,
            method,
            i = 0,
            len;
            
        if (!fn) {
            throw 'No direct function specified for this proxy';
        }
            
        if (operation.allowWrite()) {
            request = writer.write(request);
        }
        
        if (operation.action == 'read') {
            // We need to pass params
            method = fn.directCfg.method;
            
            if (method.ordered) {
                if (method.len > 0) {
                    if (paramOrder) {
                        for (len = paramOrder.length; i < len; ++i) {
                            args.push(params[paramOrder[i]]);
                        }
                    } else if (me.paramsAsHash) {
                        args.push(params);
                    }
                }
            } else {
                args.push(params);
            }
        } else {
            args.push(request.jsonData);
        }
        
        Ext.apply(request, {
            args: args,
            directFn: fn
        });
        args.push(me.createRequestCallback(request, operation, callback, scope), me);
        fn.apply(window, args);
    },
    
    /*
     * Inherit docs. We don't apply any encoding here because
     * all of the direct requests go out as jsonData
     */
    applyEncoding: function(value){
        return value;
    },
    
    createRequestCallback: function(request, operation, callback, scope){
        var me = this;
        
        return function(data, event){
            me.processResponse(event.status, operation, request, data, callback, scope);
        };
    },
    
    // inherit docs
    buildUrl: function(){
        return '';
    }
});
