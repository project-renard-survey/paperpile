/**
 * A mechanism for displaying data using custom layout templates and formatting. DataView uses an {@link Ext.XTemplate}
 * as its internal templating mechanism, and is bound to an {@link Ext.data.Store}
 * so that as the data in the store changes the view is automatically updated to reflect the changes.  The view also
 * provides built-in behavior for many common events that can occur for its contained items including click, doubleclick,
 * mouseover, mouseout, etc. as well as a built-in selection model. <b>In order to use these features, an {@link #itemSelector}
 * config must be provided for the DataView to determine what nodes it will be working with.</b>
 *
 * <p>The example below binds a DataView to a {@link Ext.data.Store} and renders it into an {@link Ext.panel.Panel}.</p>
 * <pre><code>
Ext.regModel('Image', {
    fields: [
        'name', 'url',
        {name:'size', type: 'float'},
        {name:'lastmod', type:'date', dateFormat:'timestamp'}
    ]
});
var store = new Ext.data.Store({
    autoLoad: true,
    model: 'Image',
    proxy: {
        type: 'ajax',
        url: 'get-images.php',,
        reader: {
            type: 'json',
            root: 'images'
        }
    }
    fields: [
        'name', 'url',
        {name:'size', type: 'float'},
        {name:'lastmod', type:'date', dateFormat:'timestamp'}
    ]
});
var tpl = new Ext.XTemplate(
    '&lt;tpl for="."&gt;',
        '&lt;div class="thumb-wrap" id="{name}"&gt;',
        '&lt;div class="thumb"&gt;&lt;img src="{url}" title="{name}"&gt;&lt;/div&gt;',
        '&lt;span class="x-editable"&gt;{shortName}&lt;/span&gt;&lt;/div&gt;',
    '&lt;/tpl&gt;',
    '&lt;div class="x-clear"&gt;&lt;/div&gt;'
);

var panel = new Ext.panel.Panel({
    renderTo: document.body,
    frame:true,
    width:535,
    height: 400,
    layout:'fit',
    title:'Simple DataView',

    items: new Ext.DataView({
        store: store,
        tpl: tpl,
        itemSelector:'div.thumb-wrap',
        emptyText: 'No images to display'
    })
});
 * </code></pre>
 * @class Ext.DataView
 * @extends Ext.AbstractDataView
 * @xtype dataview
 */
Ext.define('Ext.DataView', {
    extend: 'Ext.AbstractDataView',
    alias: 'widget.dataview',
    
    inheritableStatics: {
        EventMap: {
            mousedown: 'MouseDown',
            mouseup: 'MouseUp',
            click: 'Click',
            dblclick: 'DblClick',
            contextmenu: 'ContextMenu',
            mouseover: 'MouseOver',
            mouseout: 'MouseOut',
            mouseenter: 'MouseEnter',
            mouseleave: 'MouseLeave'
        }
    },
    
    addCmpEvents: function() {
        this.addEvents(
            /**
             * @event beforeitemmousedown
             * Fires before the mousedown event on an item is processed. Returns false to cancel the default action.
             * @param {Ext.DataView} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'beforeitemmousedown',
            /**
             * @event beforeitemmouseup
             * Fires before the mouseup event on an item is processed. Returns false to cancel the default action.
             * @param {Ext.DataView} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'beforeitemmouseup',
            /**
             * @event beforeitemmouseenter
             * Fires before the mouseenter event on an item is processed. Returns false to cancel the default action.
             * @param {Ext.DataView} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'beforeitemmouseenter',
            /**
             * @event beforeitemmouseleave
             * Fires before the mouseleave event on an item is processed. Returns false to cancel the default action.
             * @param {Ext.DataView} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'beforeitemmouseleave',
            /**
             * @event beforeitemclick
             * Fires before the click event on an item is processed. Returns false to cancel the default action.
             * @param {Ext.DataView} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'beforeitemclick',
            /**
             * @event beforeitemdblclick
             * Fires before the dblclick event on an item is processed. Returns false to cancel the default action.
             * @param {Ext.DataView} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'beforeitemdblclick',
            /**
             * @event beforeitemcontextmenu
             * Fires before the contextmenu event on an item is processed. Returns false to cancel the default action.
             * @param {Ext.DataView} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'beforeitemcontextmenu',            
            /**
             * @event itemmousedown
             * Fires when there is a mouse down on an item
             * @param {Ext.DataView} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'itemmousedown',
            /**
             * @event itemmouseup
             * Fires when there is a mouse up on an item
             * @param {Ext.DataView} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'itemmouseup',
            /**
             * @event itemmouseenter
             * Fires when the mouse enters an item.
             * @param {Ext.DataView} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'itemmouseenter',
            /**
             * @event itemmouseleave
             * Fires when the mouse leaves an item.
             * @param {Ext.DataView} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'itemmouseleave',
            /**
             * @event itemclick
             * Fires when an item is clicked.
             * @param {Ext.DataView} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'itemclick',
            /**
             * @event itemdblclick
             * Fires when an item is double clicked.
             * @param {Ext.DataView} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'itemdblclick',
            /**
             * @event itemcontextmenu
             * Fires when an item is right clicked.
             * @param {Ext.DataView} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'itemcontextmenu',            
            /**
             * @event beforecontainermousedown
             * Fires before the mousedown event on the container is processed. Returns false to cancel the default action.
             * @param {Ext.DataView} this
             * @param {Ext.EventObject} e The raw event object
             */
            'beforecontainermousedown',
            /**
             * @event beforecontainermouseup
             * Fires before the mouseup event on the container is processed. Returns false to cancel the default action.
             * @param {Ext.DataView} this
             * @param {Ext.EventObject} e The raw event object
             */
            'beforecontainermouseup',
            /**
             * @event beforecontainermouseover
             * Fires before the mouseover event on the container is processed. Returns false to cancel the default action.
             * @param {Ext.DataView} this
             * @param {Ext.EventObject} e The raw event object
             */
            'beforecontainermouseover',
            /**
             * @event beforecontainermouseout
             * Fires before the mouseout event on the container is processed. Returns false to cancel the default action.
             * @param {Ext.DataView} this
             * @param {Ext.EventObject} e The raw event object
             */
            'beforecontainermouseout',
            /**
             * @event beforecontainerclick
             * Fires before the click event on the container is processed. Returns false to cancel the default action.
             * @param {Ext.DataView} this
             * @param {Ext.EventObject} e The raw event object
             */
            'beforecontainerclick',
            /**
             * @event beforecontainerdblclick
             * Fires before the dblclick event on the container is processed. Returns false to cancel the default action.
             * @param {Ext.DataView} this
             * @param {Ext.EventObject} e The raw event object
             */
            'beforecontainerdblclick',
            /**
             * @event beforecontainercontextmenu
             * Fires before the contextmenu event on the container is processed. Returns false to cancel the default action.
             * @param {Ext.DataView} this
             * @param {Ext.EventObject} e The raw event object
             */
            'beforecontainercontextmenu',
            /**
             * @event containermouseup
             * Fires when there is a mouse up on the container
             * @param {Ext.DataView} this
             * @param {Ext.EventObject} e The raw event object
             */
            'containermouseup',
            /**
             * @event containermouseover
             * Fires when you move the mouse over the container.
             * @param {Ext.DataView} this
             * @param {Ext.EventObject} e The raw event object
             */
            'containermouseover',
            /**
             * @event containermouseout
             * Fires when you move the mouse out of the container.
             * @param {Ext.DataView} this
             * @param {Ext.EventObject} e The raw event object
             */
            'containermouseout',
            /**
             * @event containerclick
             * Fires when the container is clicked.
             * @param {Ext.DataView} this
             * @param {Ext.EventObject} e The raw event object
             */
            'containerclick',
            /**
             * @event containerdblclick
             * Fires when the container is double clicked.
             * @param {Ext.DataView} this
             * @param {Ext.EventObject} e The raw event object
             */
            'containerdblclick',
            /**
             * @event containercontextmenu
             * Fires when the container is right clicked.
             * @param {Ext.DataView} this
             * @param {Ext.EventObject} e The raw event object
             */
            'containercontextmenu',
                      
            /**
             * @event selectionchange
             * Fires when the selected nodes change. Relayed event from the underlying selection model.
             * @param {Ext.DataView} this
             * @param {Array} selections Array of the selected nodes
             */
            'selectionchange',
            /**
             * @event beforeselect
             * Fires before a selection is made. If any handlers return false, the selection is cancelled.
             * @param {Ext.DataView} this
             * @param {HTMLElement} node The node to be selected
             * @param {Array} selections Array of currently selected nodes
             */
            'beforeselect'
        );
    },
    // private
    afterRender: function(){
        var me = this, 
            listeners;
        
        me.callParent();

        listeners = {
            scope: me,
            click: me.handleEvent,
            mousedown: me.handleEvent,
            mouseup: me.handleEvent,
            dblclick: me.handleEvent,
            contextmenu: me.handleEvent,
            mouseover: me.handleEvent,
            mouseout: me.handleEvent
        };
        
        me.mon(me.getTargetEl(), listeners);
        
        if (me.store) {
            me.bindStore(me.store, true);
        }
    },
    
    handleEvent: function(e) {
        if (this.processUIEvent(e) !== false) {
            this.processSpecialEvent(e);
        }
    },
    
    // Private template method
    processItemEvent: Ext.emptyFn,
    processContainerEvent: Ext.emptyFn,
    processSpecialEvent: Ext.emptyFn,
    
    processUIEvent: function(e, type) {
        var me = this,
            item = e.getTarget(me.getItemSelector(), me.getTargetEl()),
            type = type || e.type,
            map = this.statics().EventMap,
            index, record;
        
        // There is this weird bug when you hover over the border of a cell it is saying
        // the target is the table.        
        if (!item && type == 'mouseover' && me.mouseOverItem && Ext.fly(me.mouseOverItem).getRegion().contains(e.getPoint())) {
            item = me.mouseOverItem;
        }
        
        if (item) {
            index = me.indexOf(item);
            record = me.getRecord(item);
            
            if (me.processItemEvent(type, record, item, index, e) === false) {
                return false;
            }
            
            type = me.isNewItemEvent(type, item, e);
            if (type === false) {
                return false;
            }
            
            if (
                (me['onBeforeItem' + map[type]](record, item, index, e) === false) ||
                (me.fireEvent('beforeitem' + type, me, record, item, index, e) === false) ||
                (me['onItem' + map[type]](record, item, index, e) === false)
            ) { 
                return false;
            }
            
            me.fireEvent('item' + type, me, record, item, index, e);
        } 
        else {
            if (
                (me.processContainerEvent(type, e) === false) ||
                (me['onBeforeContainer' + map[type]](e) === false) ||
                (me.fireEvent('beforecontainer' + type, me, e) === false) ||
                (me['onContainer' + map[type]](e) === false)
            ) {
                return false;
            }
            
            me.fireEvent('container' + type, me, e);
        }
        
        return true;
    },
    
    isNewItemEvent: function(type, item, e) {
        var me = this;
        switch (type) {
            case 'mouseover':
                if (item === me.mouseOverItem) {
                    return false;
                }
                me.mouseOverItem = item;
                return 'mouseenter';
            break;
            
            case 'mouseout':
                if (Ext.fly(me.mouseOverItem).getRegion().contains(e.getPoint())) {
                    return false;
                }
                me.mouseOverItem = null;
                return 'mouseleave';
            break;
        }
        return type;
    },
    
    // private
    onItemMouseEnter: function(record, item, index, e) {
        this.highlightItem(item);
    },

    // private
    onItemMouseLeave : function(record, item, index, e) {
        this.clearHighlight();
    },

    // @private, template methods
    onItemMouseDown: Ext.emptyFn,
    onItemMouseUp: Ext.emptyFn,
    onItemClick: Ext.emptyFn,
    onItemDblClick: Ext.emptyFn,
    onItemContextMenu: Ext.emptyFn,
    onBeforeItemMouseDown: Ext.emptyFn,
    onBeforeItemMouseUp: Ext.emptyFn,
    onBeforeItemMouseEnter: Ext.emptyFn,
    onBeforeItemMouseLeave: Ext.emptyFn,
    onBeforeItemClick: Ext.emptyFn,
    onBeforeItemDblClick: Ext.emptyFn,
    onBeforeItemContextMenu: Ext.emptyFn,
    
    // @private, template methods
    onContainerMouseDown: Ext.emptyFn,
    onContainerMouseUp: Ext.emptyFn,
    onContainerMouseOver: Ext.emptyFn,
    onContainerMouseOut: Ext.emptyFn,
    onContainerClick: Ext.emptyFn,
    onContainerDblClick: Ext.emptyFn,
    onContainerContextMenu: Ext.emptyFn,
    onBeforeContainerMouseDown: Ext.emptyFn,
    onBeforeContainerMouseUp: Ext.emptyFn,
    onBeforeContainerMouseOver: Ext.emptyFn,
    onBeforeContainerMouseOut: Ext.emptyFn,
    onBeforeContainerClick: Ext.emptyFn,
    onBeforeContainerDblClick: Ext.emptyFn,
    onBeforeContainerContextMenu: Ext.emptyFn,
    
    /**
     * Highlight a given item in the DataView. This is called by the mouseover handler if {@link #overItemCls}
     * and {@link #trackOver} are configured, but can also be called manually by other code, for instance to
     * handle stepping through the list via keyboard navigation.
     * @param {HTMLElement} item The item to highlight
     */
    highlightItem: function(item) {
        var me = this;
        me.clearHighlight();
        me.highlightedItem = item;
        Ext.fly(item).addCls(me.overItemCls);
    },

    /**
     * Un-highlight the currently highlighted item, if any.
     */
    clearHighlight: function() {
        var me = this,
            highlighted = me.highlightedItem;
            
        if (highlighted) {
            Ext.fly(highlighted).removeCls(me.overItemCls);
            delete me.highlightedItem;
        }
    },

    refresh: function() {
        this.clearHighlight();
        this.callParent(arguments);
    }
});