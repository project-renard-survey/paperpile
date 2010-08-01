/* Copyright 2009, 2010 Paperpile

   This file is part of Paperpile

   Paperpile is free software: you can redistribute it and/or modify it
   under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Paperpile is distributed in the hope that it will be useful, but
   WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
   General Public License for more details.  You should have received a
   copy of the GNU General Public License along with Paperpile.  If
   not, see http://www.gnu.org/licenses. */

Paperpile.PluginGridDB = function(config) {
  Ext.apply(this, config);

  Paperpile.PluginGridDB.superclass.constructor.call(this, {});
};

Ext.extend(Paperpile.PluginGridDB, Paperpile.PluginGrid, {

  plugin_base_query: '',
  plugin_iconCls: 'pp-icon-folder',
  plugin_name: 'DB',

  welcomeMsg: [
    '<div class="pp-box pp-box-side-panel pp-box-style1 pp-box-welcome"',
    '<h2>Welcome to Paperpile</h2>',
    '<p>Your library is still empty. <p>',
    '<p>To get started, <p>',
    '<ul>',
    '<li>import your <a href="#" class="pp-textlink" onClick="Paperpile.main.pdfExtract();">PDF collection</a></li>',
    '<li>get references from a <a href="#" class="pp-textlink" onClick="Paperpile.main.fileImport();">bibliography file</a></li>',
    '<li>start searching for papers using ',
    '<a href="#" class="pp-textlink" onClick=',
    '"Paperpile.main.tabs.newPluginTab(\'PubMed\', {plugin_name: \'PubMed\', plugin_query:\'\'});">PubMed</a> or ',
    '<a href="#" class="pp-textlink" onClick=',
    '"Paperpile.main.tabs.newPluginTab(\'GoogleScholar\', {plugin_name: \'GoogleScholar\', plugin_query:\'\'});">Google Scholar</a></li>',
    '</ul>',
    '</div>'],

  initComponent: function() {

    Paperpile.PluginGridDB.superclass.initComponent.call(this);
    this.limit = Paperpile.main.globalSettings['pager_limit'] || 25;

    this.actions['NEW'] = new Ext.Action({
      text: 'New Reference',
      iconCls: 'pp-icon-add',
      handler: function() {
        this.handleEdit(true);
      },
      scope: this,
      itemId: 'new_button',
      tooltip: 'Manually create a new reference for your library'
    });

    this.actions['FOCUS_SEARCH'] = new Ext.Action({
      text: 'Search',
      handler: this.handleFocusSearch,
      scope: this,
      itemId: 'FOCUS_SEARCH',
    }),
    this.keys.bindAction('[/,191]', this.actions['FOCUS_SEARCH']);
    this.keys.bindAction('ctrl-f', this.actions['FOCUS_SEARCH']);

    var store = this.getStore();
    store.baseParams['plugin_search_pdf'] = 0;
    store.baseParams['limit'] = this.limit;

    this.getBottomToolbar().pageSize = parseInt(this.limit);

    store.on('load',
      function() {
        if (this.getStore().getCount() == 0) {
          var panel = this.getPluginPanel();
          if (panel.itemId == 'MAIN' && this.getStore().baseParams.plugin_query == "") {
            // This needs to be deferred by a bit, so it happens AFTER the onEmpty('') call within the grid.js onStoreLoad method.
            panel.onEmpty.defer(10, panel, [this.welcomeMsg]);
          }
        }
      },
      this);

    store.load({
      params: {
        start: 0,
        limit: this.limit
      }
    });
    this.on({
      render: {
        scope: this,
        fn: this.createSortHandles
      }
    });
  },

  createSortHandles: function() {
    var target = Ext.DomHelper.append(Ext.get(this.getView().getHeaderCell(1)).first(),
    '<div id="pp-grid-sort-container_' + this.id + '" class="pp-grid-sort-container"></div>', true);

    Ext.DomHelper.append(target, '<div class="pp-grid-sort-item pp-grid-sort-desc"     action="created" status="desc" default="desc">Date added</div>');
    Ext.DomHelper.append(target, '<div class="pp-grid-sort-item pp-grid-sort-inactive" action="journal" status="inactive" default="asc">Journal</div>');
    Ext.DomHelper.append(target, '<div class="pp-grid-sort-item pp-grid-sort-inactive" action="year" status="inactive" default="desc">Year</div>');
    Ext.DomHelper.append(target, '<div class="pp-grid-sort-item pp-grid-sort-inactive" action="author" status="inactive" default="asc">Author</div>');
    Ext.DomHelper.append(target, '<div class="pp-grid-sort-item pp-grid-sort-inactive" action="pdf" status="inactive" default="desc">PDF</div>');
    Ext.DomHelper.append(target, '<div class="pp-grid-sort-item pp-grid-sort-inactive" action="attachments" status="inactive" default="desc">Supp. material</div>');
    Ext.DomHelper.append(target, '<div class="pp-grid-sort-item pp-grid-sort-inactive" action="notes" status="inactive" default="desc">Notes</div>');

    target.on('click', this.handleSortButtons, this);
  },

  handleFocusSearch: function() {
    this.filterField.getEl().focus();
  },

  currentSortField: '',
  handleSortButtons: function(e, el, o) {
    var currentClass = el.getAttribute('class');
    var field = el.getAttribute('action');
    var status = el.getAttribute('status');
    var def = el.getAttribute('default');

    if (field != this.currentSortField) {
      //log(field);
      status = "inactive";
    }
    this.currentSortField = field;

    var classes = {
      inactive: 'pp-grid-sort-item pp-grid-sort-inactive',
      asc: 'pp-grid-sort-item pp-grid-sort-asc',
      desc: 'pp-grid-sort-item pp-grid-sort-desc'
    };

    if (! (status == 'inactive' || status == 'asc' || status == 'desc')) return;

    var El = Ext.get(el);

    Ext.each(El.parent().query('div'),
    function(item) {
      var l = Ext.get(item);
      l.removeClass('pp-grid-sort-item');
      l.removeClass('pp-grid-sort-asc');
      l.removeClass('pp-grid-sort-desc');
      l.removeClass('pp-grid-sort-inactive');
      if (item == el) return;
      l.addClass(classes.inactive);
    });

    var store = this.getStore();
    if (status == "inactive") {
      if (def == 'desc') {
        El.addClass(classes.desc);
        store.baseParams['plugin_order'] = field + " DESC";
        el.setAttribute('status', 'desc');
      } else {
        El.addClass(classes.asc);
        store.baseParams['plugin_order'] = field + " ASC";
        el.setAttribute('status', 'asc');
      }
    } else {
      if (status == "desc") {
        store.baseParams['plugin_order'] = field;
        El.addClass(classes.asc);
        el.setAttribute('status', 'asc');
      } else {
        El.addClass(classes.desc);
        store.baseParams['plugin_order'] = field + " DESC";
        el.setAttribute('status', 'desc');
      }
    }

    if (this.filterField.getRawValue() == "") {
      this.getStore().reload({
        params: {
          start: 0,
          task: "NEW"
        }
      });
    } else {
      this.filterField.onTrigger2Click();
    }
  },

  toggleFilter: function(item, checked) {

    var filter_button = this.filterButton;

    // Toggle 'search_pdf' option 
    this.getStore().baseParams['plugin_search_pdf'] = 1;

    // Specific fields
    if (item.itemId != 'all') {
      if (checked) {
        this.filterField.singleField = item.itemId;
        this.getStore().baseParams['plugin_search_pdf'] = 0;
      } else {
        if (this.filterField.singleField == item.itemId) {
          this.filterField.singleField = "";
        }
      }
    }

    if (!filter_button.oldIcon) {
      filter_button.useSetClass = false;
      filter_button.oldIcon = filter_button.icon;
    }

    if (checked) {
      if (item.itemId == 'all') {
        delete filter_button.minWidth;
        filter_button.setText(null);
        filter_button.setIcon(filter_button.oldIcon);
        filter_button.el.addClass('x-btn-icon');
        filter_button.el.removeClass('x-btn-noicon');
      } else {
        delete filter_button.minWidth;
        filter_button.setIcon(null);
        filter_button.setText(item.text);
        filter_button.el.addClass('x-btn-noicon');
        filter_button.el.removeClass('x-btn-icon');
      }
      this.filterField.onTrigger2Click();
    }

  },

  setSearchQuery: function(text) {
    this.filterField.setValue(text);
    this.filterField.onTrigger2Click();
  },

  createContextMenu: function() {
    Paperpile.PluginGridDB.superclass.createContextMenu.call(this);
  },

  createToolbarMenu: function() {
    this.filterMenu = new Ext.menu.Menu({
      defaults: {
        checked: false,
        group: 'filter' + this.id,
        checkHandler: this.toggleFilter,
        scope: this
      },
      items: [{
        text: 'All fields',
        checked: true,
        itemId: 'all'
      },
        '-', {
          text: 'Author',
          itemId: 'author'
        },
        {
          text: 'Title',
          itemId: 'title'
        },
        {
          text: 'Journal',
          itemId: 'journal'
        },
        {
          text: 'Abstract',
          itemId: 'abstract'
        },
        {
          text: 'Fulltext',
          itemId: 'text'
        },
        {
          text: 'Notes',
          itemId: 'notes'
        },
        {
          text: 'Year',
          itemId: 'year'
        }]
    });

    this.actions['FILTER_BUTTON'] = new Ext.Button({
      itemId: 'FILTER_BUTTON',
      icon: '/images/icons/magnifier.png',
      tooltip: 'Choose field(s) to search',
      menu: this.filterMenu
    });
    this.filterButton = this.actions['FILTER_BUTTON'];
    this.actions['FILTER_FIELD'] = new Ext.app.FilterField({
      itemId: 'FILTER_FIELD',
      id: 'grid_filter_field',
      emptyText: 'Search References',
      store: this.getStore(),
      base_query: this.plugin_base_query,
      width: 200
    });
    this.filterField = this.actions['FILTER_FIELD'];

    this.filterField.on('specialkey', function(f, e) {
      if (e.getKey() == e.ENTER) {
        // Select the first grid row on Enter.
        this.getSelectionModel().selectRowAndSetCursor(0);
      }
    },
    this);

    Paperpile.PluginGridDB.superclass.createToolbarMenu.call(this);
  },

  initToolbarMenuItemIds: function() {
    Paperpile.PluginGridDB.superclass.initToolbarMenuItemIds.call(this);
    var ids = this.toolbarMenuItemIds;

    ids.insert(0, 'FILTER_FIELD');
    ids.insert(1, 'FILTER_BUTTON');

    var index = ids.indexOf('TB_FILL');
    ids.insert(index + 1, 'NEW');

    index = ids.indexOf('SELECT_ALL');
    ids.insert(index + 0, 'EDIT');
//    ids.insert(index + 1, 'EDIT');

  },

  isContextItem: function(item) {
    if (item.ownerCt.itemId == 'context') {
      return true;
    }
  },
  isToolbarItem: function(item) {
    Paperpile.log(item);
    return true;
  },

  updateButtons: function() {
    Paperpile.PluginGridDB.superclass.updateButtons.call(this);

    var tbar = this.getTopToolbar();

    var selectionCount = this.getSelectionModel().getCount();

    if (selectionCount > 1) {
      var item = tbar.getComponent('EDIT');
      if (item) {
        item.disable();
      }
      item = tbar.getComponent('VIEW_PDF');
      if (item) {
        item.disable();
      }
    }
  },

  onUpdate: function(data) {
    Paperpile.PluginGridDB.superclass.onUpdate.call(this, data);

    // If the update has to do with collections and we are 
    // a collection tab, refresh the whole view.
    if (this.collection_type) {
      //Paperpile.log(this.collection_type);
      if (data.collection_delta) {
        this.getStore().reload();
      }
    }
  }
});

Ext.reg('pp-plugin-grid-db', Paperpile.PluginGridDB);

Paperpile.PluginPanelDB = function(config) {
  Ext.apply(this, config);

  Paperpile.PluginPanelDB.superclass.constructor.call(this, {});
};

Ext.extend(Paperpile.PluginPanelDB, Paperpile.PluginPanel, {
  createGrid: function(params) {
    return new Paperpile.PluginGridDB(params);
  }
});