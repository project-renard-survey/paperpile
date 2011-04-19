/**
 * @class Ext.grid.Header
 * @extends Ext.Component
 *
 * Clicking on a header will toggle sort by the bound dataIndex.
 *
 * Opening a menu will allow you to turn on/off Headers found in a particular
 * section.
 *
 * Allows a user to freeze columns
 * @xtype gridheader
 */
Ext.define('Ext.grid.Header', {
    extend: 'Ext.grid.HeaderContainer',
    alias: 'widget.gridheader',
    requires: ['Ext.util.KeyNav'],
    alternateClassName: 'Ext.grid.Column',

    baseCls: Ext.baseCSSPrefix + 'column-header ' + Ext.baseCSSPrefix + 'unselectable',

    // Not the standard, automatically applied overCls because we must filter out overs of child headers.
    hoverCls: Ext.baseCSSPrefix + 'column-header-over',

    handleWidth: 5,

    sortState: null,

    possibleSortStates: ['ASC', 'DESC'],

    renderTpl:
        '<div class="' + Ext.baseCSSPrefix + 'column-header-inner">' +
            '<span class="' + Ext.baseCSSPrefix + 'column-header-text">' +
                '{text}' +
            '</span>' +
            '<tpl if="!values.menuDisabled"><div class="' + Ext.baseCSSPrefix + 'column-header-trigger"></div></tpl>' +
        '</div>',

    /**
     * @cfg {String} dataIndex <p><b>Required</b>. The name of the field in the
     * grid's {@link Ext.data.Store}'s {@link Ext.data.Model} definition from
     * which to draw the column's value.</p>
     */
    dataIndex: null,

    /**
     * @cfg {String} text Optional. The header text to be used as innerHTML
     * (html tags are accepted) to display in the Grid.  <b>Note</b>: to
     * have a clickable header with no text displayed you can use the
     * default of <tt>'&#160;'</tt>.
     */
    text: '&#160',

    /**
     * @cfg {Boolean} sortable Optional. <tt>true</tt> if sorting is to be allowed on this column.
     * Whether local/remote sorting is used is specified in <code>{@link Ext.data.Store#remoteSort}</code>.
     */
    sortable: true,

    /**
     * @cfg {Boolean} hideable Optional. Specify as <tt>false</tt> to prevent the user from hiding this column
     * (defaults to true).
     */
    hideable: true,

    /**
     * @cfg {Boolean} menuDisabled
     * Defaults to false.
     */
    menuDisabled: false,

    /**
     * @cfg {Function} renderer
     * Defaults to false.
     */
    renderer: false,

    /**
     * @cfg {String} align Sets the alignment of the header and rendered columns.
     * Defaults to 'left'.
     */
    align: 'left',

    /**
     * @cfg {Boolean} draggable Indicates whether or not the header can be drag and drop re-ordered.
     * Defaults to true.
     */
    draggable: true,

    // Header does not use the typical ComponentDraggable class and therefore we
    // override this with an emptyFn. It is controlled at the HeaderDragZone.
    initDraggable: Ext.emptyFn,

    /**
     * @property {Ext.core.Element} triggerEl
     */

    /**
     * @property {Ext.core.Element} textEl
     */

    /**
     * @private
     * Set in this class to identify, at runtime, instances which are not instances of the
     * HeaderContainer base class, but are in fact, the subclass: Header.
     */
    isHeader: true,

    initComponent: function() {
        if (Ext.isDefined(this.header)) {
            this.text = this.header;
            delete this.header;
        }

        if (!this.triStateSort) {
            this.possibleSortStates.length = 2;
        }

        // A group header; It contains items which are themselves Headers
        if (Ext.isDefined(this.headers)) {
            this.isGroupHeader = true;

            if (this.dataIndex) {
                throw 'Group header may not accept a dataIndex';
            }

            // The headers become child items
            this.items = this.headers;
            delete this.headers;
            delete this.flex;
            this.width = 0;

            // Acquire initial width from sub headers
            for (var i = 0, len = this.items.length; i < len; i++) {
                this.width += this.items[i].width;
            }

            this.cls = (this.cls||'') + ' ' + Ext.baseCSSPrefix + 'group-header';
            this.sortable = false;
            this.fixed = true;
            this.align = 'center';
        }

        Ext.applyIf(this.renderSelectors, {
            titleContainer: '.' + Ext.baseCSSPrefix + 'column-header-inner',
            triggerEl: '.' + Ext.baseCSSPrefix + 'column-header-trigger',
            textEl: '.' + Ext.baseCSSPrefix + 'column-header-text'
        });

        // Initialize as a HeaderContainer
        this.callParent(arguments);
    },

    onAdd: function(childHeader) {
        childHeader.isSubHeader = true;
        childHeader.addCls(Ext.baseCSSPrefix + 'group-sub-header');
    },

    onRemove: function(childHeader) {
        childHeader.isSubHeader = false;
        childHeader.removeCls(Ext.baseCSSPrefix + 'group-sub-header');
    },

    initRenderData: function() {
        Ext.applyIf(this.renderData, {
            text: this.text,
            menuDisabled: this.menuDisabled
        });
        return Ext.grid.Header.superclass.initRenderData.call(this);
    },

    // note that this should invalidate the menu cache
    setText: function(text) {
        this.text = text;
        if (this.rendered) {
            this.textEl.update(text);
        } 
    },

    // Find the topmost HeaderContainer: An ancestor which is NOT a Header.
    // Group Headers are themselves HeaderContainers
    getOwnerHeaderCt: function() {
        return this.up(':not(gridheader)');
    },

    afterRender: function() {
        var me = this;

        Ext.grid.Header.superclass.afterRender.call(me);


        var el = me.el;
        el.addCls(Ext.baseCSSPrefix + 'column-header-align-' + me.align);
        el.addClsOnOver(me.overCls);

        me.mon(el, {
            click:     me.onElClick,
            dblclick:  me.onElDblClick,
            scope:     me
        });
        
        me.mon(me.getFocusEl(), {
            focus: me.onTitleMouseOver,
            blur: me.onTitleMouseOut,
            scope: me
        });

        me.mon(me.titleContainer, {
            mouseenter:  me.onTitleMouseOver,
            mouseleave:  me.onTitleMouseOut,
            scope:      me
        });

        me.keyNav = Ext.create('Ext.util.KeyNav', el, {
            enter: me.onEnterKey,
            down: me.onDownKey,
            scope: me
        });
    },

    setSize: function(width, height) {
        var me = this,
            headerCt = me.ownerCt,
            siblings,
            len, i,
            oldWidth = me.width,
            newWidth = 0;

        this.callParent(arguments);

        if (this.width !== oldWidth) {

            // Bubble size changes upwards to group headers
            if (headerCt.isGroupHeader) {
                siblings = headerCt.items.items;
                len = siblings.length;

                // Size the owning group to the size of its sub headers 
                if (siblings[len - 1].rendered) {
                    for (i = 0; i < len; i++) {
                        newWidth += siblings[i].getWidth();
                    }
                    headerCt.setWidth(newWidth);
                }
            }
        }
    },

    afterComponentLayout: function(width, height) {
        var me = this,
            ownerHeaderCt = this.getOwnerHeaderCt();

        me.callParent(arguments);

        // Only changes at the base level inform the grid's HeaderContainer which will update the View
        // Skip this if it's the initial size setting in which case there is no ownerheaderCt yet - that is set afterRender
        if (!me.isGroupHeader && ownerHeaderCt) {
            ownerHeaderCt.onHeaderResize(me, width);
        }
    },

    // private
    // After the container has laid out and stretched, it calls this to correctly pad the inner to center the text vertically
    setPadding: function() {
        var me = this,
            headerHeight,
            lineHeight = parseInt(me.textEl.getStyle('line-height'), 10);

        // Top title containing element must stretch to match height of sibling group headers
        if (!me.isGroupHeader) {
            headerHeight = me.el.getViewSize().height;
            if (me.titleContainer.getHeight() < headerHeight) {
                me.titleContainer.dom.style.height = headerHeight + 'px';
            }
        }
        headerHeight = me.titleContainer.getViewSize().height;

        // Vertically center the header text in potentially vertically stretched header
        if (lineHeight) {
            me.titleContainer.setStyle({
                paddingTop: Math.max(((headerHeight - lineHeight) / 2), 0) + 'px'
            });
        }

        // Only IE needs this
        if (Ext.isIE && me.triggerEl) {
            me.triggerEl.setHeight(headerHeight);
        }
    },

    onDestroy: function() {
        var me = this;
        Ext.destroy(me.keyNav);
        delete me.keyNav;
        me.callParent(arguments);
    },

    onTitleMouseOver: function() {
        this.titleContainer.addCls(this.hoverCls);
    },

    onTitleMouseOut: function() {
        this.titleContainer.removeCls(this.hoverCls);
    },

    onDownKey: function(e) {
        this.onElClick(e, this.triggerEl.dom || this.el.dom);
    },

    onEnterKey: function(e) {
        this.onElClick(e, this.el.dom);
    },

    /**
     * @private
     * Double click 
     * @param e
     * @param t
     */
    onElDblClick: function(e, t) {
        var ownerCt = this.ownerCt;
        if (ownerCt && Ext.Array.indexOf(ownerCt.items, this) !== 0 && this.isOnLeftEdge(e) ) {
            ownerCt.expandToFit(this.previousSibling('gridheader'));
        }
    },

    onElClick: function(e, t) {

        // The grid's docked HeaderContainer.
        var ownerHeaderCt = this.getOwnerHeaderCt();

        if (ownerHeaderCt && !ownerHeaderCt.locked) {
            // Firefox doesn't check the current target in a within check.
            // Therefore we check the target directly and then within (ancestors)
            if (this.triggerEl && (e.target === this.triggerEl.dom || t === this.triggerEl.dom || e.within(this.triggerEl))) {
                ownerHeaderCt.onHeaderTriggerClick(this, e, t);
            // if its not on the left hand edge, sort
            } else if (e.getKey() || (!this.isOnLeftEdge(e) && !this.isOnRightEdge(e))) {
                this.toggleSortState();
                ownerHeaderCt.onHeaderClick(this, e, t);
            }
        }
    },

    /**
     * @private
     * Process UI events from the view. The owning TablePanel calls this method, relaying events from the TableView
     * @param {String} type Event type, eg 'click'
     * @param {TableView} view TableView Component
     * @param {HtmlElement} cell Cell HtmlElement the event took place within
     * @param {Number} recordIndex Index of the associated Store Model (-1 if none)
     * @param {Number} cellIndex Cell index within the row
     * @param {EventObject} e Original event
     */
    processEvent: function(type, view, cell, recordIndex, cellIndex, e) {
        return this.fireEvent.apply(this, arguments);
    },

    toggleSortState: function() {
        if (this.sortable) {
            var idx = Ext.Array.indexOf(this.possibleSortStates, this.sortState),
                nextIdx;

            nextIdx = (idx + 1) % this.possibleSortStates.length;
            this.setSortState(this.possibleSortStates[nextIdx]);
        }
    },

    doSort: function(state) {
        var ds = this.up('tablepanel').store;
        ds.sort({
            property: this.getSortParam(),
            direction: state
        });
    },

    /**
     * Returns the parameter to sort upon when sorting this header. By default
     * this returns the dataIndex and will not need to be overriden in most cases.
     */
    getSortParam: function() {
        return this.dataIndex;
    },

    //setSortState: function(state, updateUI) {
    //setSortState: function(state, doSort) {
    setSortState: function(state, skipClear, initial) {
        var colSortClsPrefix = Ext.baseCSSPrefix + 'column-header-sort-',
            ascCls = colSortClsPrefix + 'ASC',
            descCls = colSortClsPrefix + 'DESC',
            nullCls = colSortClsPrefix + 'null',
            ownerHeaderCt = this.getOwnerHeaderCt(),
            oldSortState = this.sortState;

        if (oldSortState !== state) {
            this.addCls(colSortClsPrefix + state);
            // don't trigger a sort on the first time, we just want to update the UI
            if (state && !initial) {
                this.doSort(state);
            }
            switch (state) {
                case 'DESC':
                    this.removeCls(ascCls, nullCls);
                    break;
                case 'ASC':
                    this.removeCls(descCls, nullCls);
                    break;
                case null:
                    this.removeCls(ascCls, descCls);
                    break;
            }
    
            if (ownerHeaderCt && !this.triStateSort && !skipClear) {
                ownerHeaderCt.clearOtherSortStates(this);
            }
            this.sortState = state;
            ownerHeaderCt.fireEvent('sortchange', ownerHeaderCt, this, state);
        }
    },

    hide: function() {
        var items,
            len, i,
            lb,
            newWidth = 0,
            ownerCt = this.getOwnerHeaderCt();

        // Hiding means setting to zero width, so cache the width
        this.oldWidth = this.getWidth();

        // Hiding a group header hides itself, and then informs the HeaderContainer about its sub headers (Suppressing header layout)
        if (this.isGroupHeader) {
            items = this.items.items;
            this.callParent(arguments);
            ownerCt.onHeaderHide(this);
            for (i = 0, len = items.length; i < len; i++) {
                items[i].hidden = true;
                ownerCt.onHeaderHide(items[i], true);
            }
            return;
        }

        // TODO: Work with Jamie to produce a scheme where we can show/hide/resize without triggering a layout cascade
        lb = this.ownerCt.componentLayout.layoutBusy;
        this.ownerCt.componentLayout.layoutBusy = true;
        this.callParent(arguments);
        this.ownerCt.componentLayout.layoutBusy = lb;

        // Notify owning HeaderContainer
        ownerCt.onHeaderHide(this);

        if (this.ownerCt.isGroupHeader) {
            // If we've just hidden the last header in a group, then hide the group
            items = this.ownerCt.query('>:not([hidden])');
            if (!items.length) {
                this.ownerCt.hide();
            }
            // Size the group down to accommodate fewer sub headers
            else {
                for (i = 0, len = items.length; i < len; i++) {
                    newWidth += items[i].getWidth();
                }
                this.ownerCt.setWidth(newWidth);
            }
        }
    },

    show: function() {
        var ownerCt = this.getOwnerHeaderCt(),
            lb,
            items,
            len, i,
            newWidth = 0;

        // TODO: Work with Jamie to produce a scheme where we can show/hide/resize without triggering a layout cascade
        lb = this.ownerCt.componentLayout.layoutBusy;
        this.ownerCt.componentLayout.layoutBusy = true;
        this.callParent(arguments);
        this.ownerCt.componentLayout.layoutBusy = lb;

        // If a sub header, ensure that the group header is visible
        if (this.isSubHeader) {
            if (!this.ownerCt.isVisible()) {
                this.ownerCt.show();
            }
        }

        // If we've just shown a group with all its sub headers hidden, then show all its sub headers
        if (this.isGroupHeader && !this.query(':not([hidden])').length) {
            items = this.query('>*');
            for (i = 0, len = items.length; i < len; i++) {
                items[i].show();
            }
        }

        // Resize the owning group to accommodate
        if (this.ownerCt.isGroupHeader) {
            items = this.ownerCt.query('>:not([hidden])');
            for (i = 0, len = items.length; i < len; i++) {
                newWidth += items[i].getWidth();
            }
            this.ownerCt.setWidth(newWidth);
        }

        // Notify owning HeaderContainer
        if (ownerCt) {
            ownerCt.onHeaderShow(this);
        }
    },

    getDesiredWidth: function() {
        var me = this;
        if (me.rendered && me.componentLayout && me.componentLayout.lastComponentSize) {
            // headers always have either a width or a flex
            // because HeaderContainer sets a defaults width
            // therefore we can ignore the natural width
            // we use the componentLayout's tracked width so that
            // we can calculate the desired width when rendered
            // but not visible because its being obscured by a layout
            return me.componentLayout.lastComponentSize.width;
        // Flexed but yet to be rendered this could be the case
        // where a HeaderContainer and Headers are simply used as data
        // structures and not rendered.
        }
        else if (me.flex) {
            // this is going to be wrong, the defaultWidth
            return me.width;
        }
        else {
            return me.width;
        }
    },

    getCellSelector: function() {
        return '.' + Ext.baseCSSPrefix + 'grid-cell-' + this.id;
    },

    getCellInnerSelector: function() {
        return this.getCellSelector() + ' .' + Ext.baseCSSPrefix + 'grid-cell-inner';
    },

    isOnLeftEdge: function(e) {
        return (e.getXY()[0] - this.el.getLeft() <= this.handleWidth);
    },

    isOnRightEdge: function(e) {
        return (this.el.getRight() - e.getXY()[0] <= this.handleWidth);
    },
    
    /**
     * Retrieves the editing field for editing associated with this header. Returns false if there
     * is no field associated with the Header the method will return false. If the
     * field has not been instantiated it will be created.
     * @returns {Ext.form.Field} field
     */
    getEditingField: function() {
        var field = this.field;
        if (!field) {
            return false;
        } else {
            // if already created
            if (field.events) {
                return field;
            } else {
                return Ext.ComponentMgr.create(field, 'textfield');
            }
        }
    },
    
    /**
     * Sets the form field to be used for editing.
     * @param {Mixed} field An object representing a field to be created. If no xtype is specified a 'textfield' is assumed.
     */
    setEditingField: function(field) {
        var oldField = this.field;
        if (oldField.destroy) {
            oldField.destroy();
        }
        this.field = field;
    }
});