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

Paperpile.PluginGrid = function(config) {

  Ext.apply(this, config);

  Paperpile.PluginGrid.superclass.constructor.call(this, {});

  this.on('rowcontextmenu', this.onContextClick, this);
};

Ext.extend(Paperpile.PluginGrid, Ext.grid.GridPanel, {

  plugin_query: '',
  region: 'center',
  limit: 25,
  allSelected: false,
  allImported: false,
  itemId: 'grid',
  aboutPanel: null,
  overviewPanel: null,
  detailsPanel: null,
  tagStyles: {},

  initComponent: function() {
    this.pager = new Paperpile.Pager({
      pageSize: this.limit,
      store: this.getStore(),
      displayInfo: true,
      displayMsg: 'Displaying references {0} - {1} of {2}',
      emptyMsg: "No references to display"
    });

    var renderPub = function(value, p, record) {
      record.data._notes_tip = Ext.util.Format.stripTags(record.data.annote);
      record.data._citekey = Ext.util.Format.ellipsis(record.data.citekey, 18);
      record.data._createdPretty = Paperpile.utils.prettyDate(record.data.created);

      if (record.data.doi) {
        var wrapped = record.data.doi;

        if (wrapped.length > 25) {
          wrapped = wrapped.replace(/\//, '/<br/>');
        }

        record.data._doiWrapped = wrapped;
      }

      // Shrink very long author lists.
      record.data._long_authorlist = 0;
      var ad = record.data._authors_display || '';
      var authors_array = ad.split(",");

      var n = authors_array.length;
      var author_length_threshold = 25;
      var author_keep_beginning = 5;
      var author_keep_end = 5;
      if (authors_array.length > author_length_threshold) {
        var authors_first_five = authors_array.slice(0, author_keep_beginning);
        var authors_middle = authors_array.slice(author_keep_beginning, n - author_keep_end);
        var hidden_n = authors_middle.length;
        var authors_last_five = authors_array.slice(n - author_keep_end, n);
        record.data._authors_display = [
          authors_first_five.join(", "),
          ' ... <a class="pp-authortip">',
          '(' + hidden_n + ' more)',
          '</a> ... ',
          authors_last_five.join(", ")].join("");

        var displayText = [
          '<b>' + n + ' authors:</b> ',
          authors_array.join(", ")].join("");
        record.data._authortip = displayText;
      }

      return this.getPubTemplate().apply(record.data);
    };

    var renderIcons = function(value, p, record) {
      record.data._notes_tip = Ext.util.Format.stripTags(record.data.annote);
      record.data._citekey = Ext.util.Format.ellipsis(record.data.citekey, 18);
      record.data._createdPretty = Paperpile.utils.prettyDate(record.data.created);

      if (record.data._imported) {
        if (record.data.last_read) {
          record.data._last_readPretty = 'Last read: ' + Paperpile.utils.prettyDate(record.data.last_read);
        } else {
          record.data._last_readPretty = 'Never read';
        }
      } else {
        record.data._last_readPretty = 'Click <i>Import</i> to add file to your library.';
      }

      if (record.data.attachments) {
        record.data._attachments_count = record.data.attachments.split(/,/).length;
      }

      return this.getIconTemplate().apply(record.data);
    };

    this.actions = {
      'EDIT': new Ext.Action({
        text: 'Edit',
        handler: function() {
          this.handleEdit(false);
        },
        scope: this,
        cls: 'x-btn-text-icon edit',
        icon: '/images/icons/pencil.png',
        itemId: 'EDIT',
        tooltip: 'Edit citation data of the selected reference'
      }),

      'DELETE': new Ext.Action({
        text: 'Move to Trash',
        iconCls: 'pp-icon-trash',
        handler: this.handleDelete,
        scope: this,
        cls: 'x-btn-text-icon',
        itemId: 'DELETE',
        tooltip: 'Move selected references to Trash'
      }),

      'EXPORT': new Ext.Action({
        text: 'Export',
        handler: this.handleExport,
        scope: this,
        itemId: 'EXPORT'
      }),

      'SELECT_ALL': new Ext.Action({
        text: 'Select all',
        handler: this.selectAll,
        scope: this,
        itemId: 'SELECT_ALL'
      }),

      'FORMAT': new Ext.Action({
        text: 'Format',
        handler: this.formatEntry,
        scope: this,
        itemId: 'FORMAT'
      }),

      'SAVE_AS_ACTIVE': new Ext.Action({
        text: 'Save as Live Folder',
        handler: this.handleSaveActive,
        scope: this,
        itemId: 'SAVE_AS_ACTIVE'
      }),

      'OPEN_PDF_FOLDER': new Ext.Action({
        text: 'Open containing folder',
        handler: this.openPDFFolder,
        scope: this,
        icon: '/images/icons/folder.png',
        itemId: 'OPEN_PDF_FOLDER',
        tooltip: {
          text: 'Open containing folder'
        }
      }),

      'VIEW_PDF': new Ext.Action({
        handler: this.openPDF,
        scope: this,
        iconCls: 'pp-icon-import-pdf',
        itemId: 'VIEW_PDF',
        text: 'View PDF',
      }),
      'MORE_FROM_FIRST_AUTHOR': new Ext.Action({
        // Note: the text of these menu items will change dynamically depending on
        // the selected reference. See the 'updateContextMenuItem' method.
        text: 'First author',
        handler: this.moreFromFirstAuthor,
        scope: this,
        itemId: 'MORE_FROM_FIRST_AUTHOR'
      }),
      'MORE_FROM_LAST_AUTHOR': new Ext.Action({
        text: 'Last author',
        handler: this.moreFromLastAuthor,
        scope: this,
        itemId: 'MORE_FROM_LAST_AUTHOR'
      }),
      'MORE_FROM_JOURNAL': new Ext.Action({
        text: 'Journal',
        handler: this.moreFromJournal,
        scope: this,
        itemId: 'MORE_FROM_JOURNAL'
      }),
      'MORE_FROM_YEAR': new Ext.Action({
        text: 'Year',
        handler: this.moreFromYear,
        scope: this,
        itemId: 'MORE_FROM_YEAR'
      }),
      'LIVE_FOLDER': new Ext.Action({
        itemId: 'LIVE_FOLDER',
        text: 'Save as Live Folder',
        iconCls: 'pp-icon-glasses',
        handler: this.handleSaveActive,
        scope: this
      }),
      'RELOAD_FEED': new Ext.Action({
        itemId: 'RELOAD_FEED',
        text: 'Reload',
        iconCls: 'pp-icon-reload',
        handler: this.reloadFeed,
        tooltip: 'Reload the content of the feed',
        scope: this
      }),
      'EXPORT_VIEW': new Ext.Action({
        itemId: 'EXPORT_VIEW',
        text: 'View',
        handler: this.handleExportView,
        scope: this
      }),
      'EXPORT_SELECTION': new Ext.Action({
        itemId: 'EXPORT_SELECTION',
        text: 'Selection',
        handler: this.handleExportSelection,
        scope: this
      }),
      'COPY_BIBTEX_KEY': new Ext.Action({
        itemId: 'COPY_BIBTEX_KEY',
        text: 'Copy LaTeX citation',
        handler: this.handleCopyBibtexKey,
        scope: this
      }),
      'COPY_BIBTEX_CITATION': new Ext.Action({
        itemId: 'COPY_BIBTEX_CITATION',
        text: 'Copy as BibTeX',
        handler: this.handleCopyBibtexCitation,
        scope: this
      }),
      'COPY_FORMATTED': new Ext.Action({
        itemId: 'COPY_FORMATTED',
        text: 'Copy citation',
        handler: this.handleCopyFormatted,
        scope: this
      }),
      'TB_SPACE': new Ext.Toolbar.Spacer({
        itemId: 'TB_SPACE',
        width: '10px'
      }),
      'TB_BREAK': new Ext.Toolbar.Separator({
        itemId: 'TB_BREAK'
      }),
      'TB_FILL': new Ext.Toolbar.Fill({
        itemId: 'TB_FILL'
      })
    };

    this.actions['PDF_COMBINED_BUTTON'] = new Ext.ux.ButtonPlus({
      items: [
        this.actions['VIEW_PDF'],
        this.actions['OPEN_PDF_FOLDER']]
    });

    this.actions['MORE_FROM_MENU'] = new Ext.menu.Item({
      text: 'More from...',
      itemId: 'MORE_FROM_MENU',
      menu: {
        items: [
          this.actions['MORE_FROM_FIRST_AUTHOR'],
          this.actions['MORE_FROM_LAST_AUTHOR'],
          this.actions['MORE_FROM_JOURNAL'],
          this.actions['MORE_FROM_YEAR']]
      }
    });

    this.actions['EXPORT_MENU'] = new Ext.Toolbar.SplitButton({
      text: 'Export to File',
      itemId: 'EXPORT_MENU',
      handler: this.handleExportView,
      iconCls: 'pp-icon-save',
      scope: this,
      menu: {
        items: [
          this.actions['EXPORT_VIEW'],
          this.actions['EXPORT_SELECTION']]
      }
    });

    this.actions['SAVE_MENU'] = new Ext.Button({
      itemId: 'SAVE_MENU',
      iconCls: 'pp-icon-save',
      cls: 'x-btn-text-icon',
      menu: {
        items: [{
          text: 'Save as Live Folder',
          iconCls: 'pp-icon-glasses',
          handler: this.handleSaveActive,
          scope: this
        },
        {
          text: 'Export contents to file',
          iconCls: 'pp-icon-disk',
          handler: this.handleExport,
          scope: this
        }]
      }
    });

    Ext.apply(this, {
      ddGroup: 'gridDD',
      enableDragDrop: true,
      appendOnly: true,
      itemId: 'grid',
      store: this.getStore(),
      view: new Ext.grid.GridView({
        grid: this
      }),
      bbar: this.pager,
      tbar: new Paperpile.Toolbar({
        itemId: 'toolbar',
        enableOverflow: true,
        menuBreakItemId: 'TB_BREAK'
      }),
      enableHdMenu: false,
      autoExpandColumn: 'publication',

      columns: [{
        header: "",
        id: 'icons',
        dataIndex: 'title',
        renderer: renderIcons.createDelegate(this),
        width: 50,
        sortable: false,
        resizable: false
      },
      {
        header: "",
        id: 'publication',
        dataIndex: 'title',
        renderer: renderPub.createDelegate(this),
        resizable: false,
        sortable: false,
        scope: this
      }]
    });

    Paperpile.PluginGrid.superclass.initComponent.call(this);

    this.on({
      // Delegate to class methods.
      beforerender: {
        scope: this,
        fn: this.myBeforeRender
      },
      afterrender: {
        scope: this,
        fn: this.myAfterRender
      },
      beforedestroy: {
        scope: this,
        fn: this.onClose
      },
      rowdblclick: {
        scope: this,
        fn: this.onDblClick
      },
      nodedragover: {
        scope: this,
        fn: this.onNodeDrag
      }
    });

    this.getStore().on({
      loadexception: {
        scope: this,
        fn: function(exception, options, response, error) {
          Paperpile.main.onError(response);
        }
      },
      load: {
        scope: this,
        fn: this.onStoreLoad
      }
    });
  },

  onNodeOver: function(nodeData, source, e, data) {
    if (data.grid) {
      e.cancel = true;
    } else if (data.node) {
      e.cancel = false;
    }

    var retVal = '';
    if (e.cancel) {
      retVal = Ext.dd.DropZone.prototype.dropNotAllowed;
    } else {
      retVal = Ext.dd.DropZone.prototype.dropAllowed;
    }

    this.updateDragStatus(nodeData, source, e, data);
    return retVal;
  },

  backgroundReload: function() {
    this.backgroundLoading = true;

    this.getStore().reload({
      callback: function() {
        this.backgroundLoading = false;
      },
      scope: this
    });
  },

  updateDragStatus: function(nodeData, source, e, data) {
    var proxy = source.proxy;
    if (source.dragData.node) {
      var myType = source.dragData.node.type;
      if (myType == 'TAGS') {
        //proxy.updateTip('Apply label to reference');
      } else if (myType == 'FOLDER') {
        //proxy.updateTip('Place reference in folder');
      }
    } else if (source.dragData.grid) {
      // We should never reach here -- no within-grid drag and drop!
    }
  },

  onNodeDrop: function(target, dd, e, data) {
    if (data.node != null) {
      // Get the index of the node being dropped upon.
      var r = e.getTarget(this.getView().rowSelector);
      var index = this.getView().findRowIndex(r);
      var record = this.getStore().getAt(index);
      // If this node is *outside* the *selection*, then drop on the node instead of
      // the whole selection.
      var sel = this.getSelection();
      if (!this.getSelectionModel().isSelected(index)) {
        sel = record.get('guid');
      }

      var tagName = data.node.text;

      if (data.node.type) {
        var type = data.node.type;
        if (type == 'FOLDER') {
          Paperpile.main.tree.addFolder(this, sel, data.node);
        } else if (type == 'TAGS') {
          Paperpile.main.tree.addTag(this, sel, data.node);
        }
      }
      return true;
    }
    return false;
  },

  onStoreLoad: function() {
    var pluginPanel = this.getPluginPanel();
    var ep = pluginPanel.items.get('east_panel');
    var tb_side = ep.getBottomToolbar();
    var activeTab = ep.getLayout().activeItem.itemId;
    if (this.getStore().getCount() > 0) {
      if (activeTab === 'about') {
        ep.getLayout().setActiveItem('overview');
        activeTab = 'overview';
      }
    } else {
      pluginPanel.onEmpty('');
      if (this.sidePanel) {
        ep.getLayout().setActiveItem('about');
        activeTab = 'about';
      }
    }
    tb_side.items.get(activeTab + '_tab_button').toggle(true);

    if (this.getSelectionModel().getCount() == 0) {
      this.getSelectionModel().selectFirstRow.defer(0, this.getSelectionModel());
    }

    pluginPanel.updateDetails();
    pluginPanel.updateButtons();
    this.updateButtons();
  },

  highlightNewArticles: function() {
    if (!this.highlightedArticles) {
      this.highlightedArticles = [];
    }

    var s = this.getStore();
    var v = this.getView();
    for (var i = 0; i < s.getCount(); i++) {
      var record = s.getAt(i);
      var el = v.getRow(i);
      if (record.data.created) {
        var secondsAgo = Paperpile.utils.secondsAgo(record.data.created);
        if (secondsAgo < 20) {
          if (!this.highlightedArticles[record.data.guid]) {
            this.highlightedArticles[record.data.guid] = 1;
            Ext.get(el).highlight("ffff9c", {
              duration: 3,
              easing: 'easeOut'
            });
          }
        }
      }
    }
  },

  myBeforeRender: function(ct) {
    this.createToolbarMenu();
    this.createContextMenu();
  },

  afterSelectionChange: function(sm) {
    // Delete the previously stored set of selected records.
    delete this._selected_records;
    this.contextRecord = null;

    var selection = this.getSelection();
    var selectedIds;
    if (selection == 'ALL') {
      selectedIds = selection;
    } else {
      selectedIds = selection.join("");
    }

    if (selectedIds == this.lastSelectedIds) {
      return;
    }
    this.lastSelectedIds = selectedIds;

    this.updateButtons();
    this.getPluginPanel().updateDetails();
    if (sm.getCount() == 1) {
      this.completeEntry();
    }
  },

  refreshView: function() {
    this.updateButtons();
    this.getPluginPanel().updateDetails();
    if (sm.getCount() == 1) {
      this.completeEntry();
    }
  },

  myAfterRender: function(ct) {
    this.updateButtons();

    this.pager.on({
      'beforechange': {
        fn: function(pager, params) {
          var lastParams = this.pager.store.lastOptions.params;
          if (params.start != lastParams.start) {
            this.getView().on('refresh', function() {
              this.getView().scrollToTop();
            },
            this, {
              single: true
            });
          }
        },
        scope: this
      }
    });

    // Note: the 'afterselectionchange' event is a custom event, defined in 
    // main/overrides.js
    this.mon(this.getSelectionModel(), 'afterselectionchange', this.afterSelectionChange, this);

    var map = new Ext.KeyMap(this.body, {
      key: Ext.EventObject.DELETE,
      handler: function() {
        var imported = this.getSelection('IMPORTED').length;
        if (imported > 0) {
          // Handle both cases of normal grids and Trash grid
          if (this.getSelectionModel().getSelected().get('trashed')) {
            this.deleteEntry('DELETE');
          } else {
            this.deleteEntry('TRASH');
          }
        }
      },
      scope: this
    });

    this.dropZone = new Paperpile.GridDropZone(this, {
      ddGroup: this.ddGroup
    });

    Paperpile.GridDragZone = Ext.extend(Ext.grid.GridDragZone, {
      proxy: new Paperpile.StatusTipProxy()
    });
    this.dragZone = new Paperpile.GridDragZone(this, {
      ddGroup: this.ddGroup
    });

    this.createAuthorToolTip();
  },

  createAuthorToolTip: function() {
    this.authorTip = new Ext.ToolTip({
      maxWidth: 500,
      showDelay: 0,
      hideDelay: 0,
      target: this.getView().mainBody,
      delegate: '.pp-authortip',
      renderTo: document.body,
      listeners: {
        beforeshow: {
          fn: function updateTipBody(tip) {
            var rowIndex = this.getView().findRowIndex(tip.triggerElement);
            var record = this.getStore().getAt(rowIndex);
            tip.body.dom.innerHTML = record.data._authortip;
          },
          scope: this
        }
      }
    });
  },

  getDragDropText: function() {
    var num = this.getSelectionModel().getCount();
    if (this.allSelected) {
      num = this.getStore().getTotalCount();
    }

    if (num == 1) {
      var key = this.getSelectionModel().getSelected().get('citekey');
      if (key) {
        return "[" + key + "]";
      } else {
        return " 1 selected reference";
      }
    } else {
      return num + " selected references";
    }
  },

  getStore: function() {
    if (this._store != null) {
      return this._store;
    }
    this._store = new Ext.data.Store({
      proxy: new Ext.data.HttpProxy({
        url: Paperpile.Url('/ajax/plugins/resultsgrid'),
        // We don't set timeout here but handle timeout separately in
        // specific plugins.
        timeout: 10000000,
        method: 'GET'
      }),
      baseParams: {
        grid_id: this.id,
        plugin_file: this.plugin_file,
        plugin_name: this.plugin_name,
        plugin_query: this.plugin_query,
        plugin_mode: this.plugin_mode,
        plugin_order: "created DESC",
        limit: this.limit
      },
      reader: new Ext.data.JsonReader()
    });

    // Add some callbacks to the store so we can maintain the selection between reloads.
    this._store.on('beforeload', function(store, options) {
      var records = this.getSelectionModel().getSelections();
      var recordIds = [];
      for (var i = 0, len = records.length; i < len; i++) {
        recordIds[i] = records[i].id;
      }
      this._selected_records = recordIds;
    },
    this);
    this._store.on('load', function(store, options) {
      // Select rows of records with the stored ids
      var rows = [];
      var recordIds = this._selected_records;
      if (recordIds === undefined) {
        recordIds = [];
      }
      for (var i = 0, len = recordIds.length; i < len; i++) {
        var index = this.getStore().indexOfId(recordIds[i]);
        if (index >= 0) {
          Paperpile.log(index);
          rows.push(index);
        }
      }
      this.getSelectionModel().selectRows(rows);
      delete this._selected_records;
    },
    this);
    return this._store;
  },

  cancelLoad: function() {

    // The refresh button does not get reset and keeps
    // spinning. It is resetted if an error occurs in the
    // proxy. Therefore I call the exception explicitly as a
    // workaround
    this.store.proxy.fireEvent('exception');

    this.store.proxy.getConnection().abort();

    // Kill process on the backend. Should not do any harm. On
    // the backend side a grid call just adds papers to the
    // _hash cache of the plugin object. I should not matter
    // if this data gets written or not as any subsequent call
    // will overwrite it or will never touch it because the
    // frontend does not know about it.
    Ext.Ajax.request({
      url: Paperpile.Url('/ajax/misc/cancel_request'),
      params: {
        cancel_handle: 'grid_' + this.id,
        kill: 1,
      },
    });
  },

  getByGUID: function(guid) {
    var index = this.getStore().find('guid', guid);
    if (index > -1) {
      return this.getStore().getAt(index);
    }
    return null;
  },

  gridTemplates: {},

  getPubTemplate: function() {
    if (this.pubTemplate == null) {
      this.pubTemplate = new Ext.XTemplate(
        '<div class="pp-grid-data" guid="{guid}">',
        '<div>',
        '<span class="pp-grid-title {_highlight}">{title}</span>{[this.tagStyle(values.tags)]}',
        '</div>',
        '<tpl if="_authors_display">',
        '<p class="pp-grid-authors">{_authors_display}</p>',
        '</tpl>',
        '<tpl if="_citation_display">',
        '<p class="pp-grid-citation">{_citation_display}</p>',
        '</tpl>',
        '<tpl if="_snippets">',
        '<p class="pp-grid-snippets">{_snippets}</p>',
        '</tpl>',
        '</div>', {
          tagStyle: function(tag_string) {
            var returnMe = ''; //<div class="pp-tag-grid-block">';
            var tags = tag_string.split(/\s*,\s*/);
            var totalChars = 0;
            for (var i = 0; i < tags.length; i++) {
              var guid = tags[i];
              var style = Paperpile.main.tagStore.getAt(Paperpile.main.tagStore.findExact('guid', guid));
              if (style != null) {
                name = style.get('name');
                style = style.get('style');
                totalChars += name.length;
                returnMe += '<div class="pp-tag-grid-inline pp-tag-style-' + style + '">' + name + '&nbsp;</div>&nbsp;';
              }
            }
            if (tags.length > 0) returnMe = "&nbsp;&nbsp;&nbsp;" + returnMe;
            return returnMe;
          }
        }).compile();
    }

    return this.pubTemplate;
  },

  getIconTemplate: function() {
    if (this.iconTemplate != null) {
      return this.iconTemplate;
    }
    this.iconTemplate = new Ext.XTemplate(
      '<div class="pp-grid-info">',
      '<tpl if="_imported">',
      '  <tpl if="trashed==0">',
      '    <div class="pp-grid-status pp-grid-status-imported" ext:qtip="[<b>{_citekey}</b>]<br>added {_createdPretty}"></div>',
      '  </tpl>',
      '  <tpl if="trashed==1">',
      '    <div class="pp-grid-status pp-grid-status-deleted" ext:qtip="[<b>{_citekey}</b>]<br>deleted {_createdPretty}"></div>',
      '  </tpl>',
      '</tpl>',
      '<tpl if="pdf">',
      '  <div class="pp-grid-status pp-grid-status-pdf" ext:qtip="<b>{pdf_name}</b><br/>{_last_readPretty}"></div>',
      '</tpl>',
      '<tpl if="attachments">',
      '  <div class="pp-grid-status pp-grid-status-attachments" ext:qtip="{_attachments_count} attached file(s)"></div>',
      '</tpl>',
      '<tpl if="annote">',
      '  <div class="pp-grid-status pp-grid-status-notes" ext:qtip="{_notes_tip}"></div>',
      '</tpl>',
      '</div>').compile();
    return this.iconTemplate;
  },

  getSidebarTemplate: function() {
    if (this.sidebarTemplate == null) {
      this.sidebarTemplate = {
        singleSelection: new Ext.XTemplate(this.getSingleSelectionTemplate()).compile(),
        multipleSelection: new Ext.XTemplate(this.getMultipleSelectionTemplate()).compile(),
        noSelection: new Ext.XTemplate(this.getNoSelectionTemplate()).compile(),
        emptyGrid: new Ext.XTemplate(this.getEmptyGridTemplate()).compile()
      };
    }
    return this.sidebarTemplate;
  },

  getSingleSelectionTemplate: function() {
    var prefix = [
      '<div id="main-container-{id}">'];
    var suffix = [
      '</div>'];
    var referenceInfo = [
      '<div class="pp-box pp-box-side-panel pp-box-top pp-box-style1">',
      '<tpl if="_imported">',
      '  <div id="ref-actions" style="float:right;">',
      '  <tpl if="trashed==1">',
      '    <img src="/images/icons/arrow_rotate_anticlockwise.png" class="pp-img-action" action="restore-ref" ext:qtip="Restore Reference"/>',
      '    <img src="/images/icons/delete.png" class="pp-img-action" action="delete-ref" ext:qtip="Permanently Delete Reference"/>',
      '  </tpl>',
      '  <tpl if="trashed==0">',
      '    <img src="/images/icons/pencil.png" class="pp-img-action" action="edit-ref" ext:qtip="Edit Reference"/>',
      '    <img src="/images/icons/trash.png" class="pp-img-action" action="delete-ref" ext:qtip="Move Reference to Trash"/>',
      '  </tpl>',
      '  </div>',
      '</tpl>',
      '<h2>Reference Info</h2>',
      '<dl>',
      '<tpl if="_pubtype_name">',
      '  <dt>Type: </dt><dd>{_pubtype_name}</dd>',
      '</tpl>',
      '<tpl if="_imported">',
      '  <tpl if="trashed==0">',
      '    <dt>Added: </dt>',
      '  </tpl>',
      '  <tpl if="trashed==1">',
      '    <dt>Deleted: </dt>',
      '  </tpl>',
      '  <dd>{_createdPretty}</dd>',
      '</tpl>',
      '<tpl if="doi">',
      '  <dt>DOI: </dt><dd>{_doiWrapped}</dd>',
      '</tpl>',
      '<tpl if="eprint">',
      '  <dt>Eprint: </dt>',
      '  <dd>{eprint}</dd>',
      '</tpl>',
      '<tpl if="pmid">',
      '  <dt>PubMed ID: </dt><dd>{pmid}</dd>',
      '</tpl>',
      '<tpl if="folders">',
      '  <dt>Folders: </dt>',
      '  <dd>',
      '    <ul class="pp-folders">',
      '    <tpl for="_folders_list">',
      '      <li class="pp-folder-list pp-folder-generic">',
      '        <a href="#" class="pp-textlink" action="open-folder" folder_id="{folder_id}" >{folder_name}</a> &nbsp;&nbsp;',
      '        <a href="#" class="pp-textlink pp-second-link" action="delete-folder" folder_id="{folder_id}" rowid="{rowid}">Remove</a>',
      '      </li>',
      '    </tpl>',
      '    </ul>',
      '  </dd>',
      '</tpl>',
      '<tpl if="_imported && !trashed">', // Don't show the labels widget if this article isn't imported.
      '  <dt>Labels: </dt>',
      '  <dd>',
      '  <div id="label-widget-{id}" class="pp-label-widget"></div>',
      '  </dd>',
      '</tpl>',
      '</dl>',
      '  <div style="clear:left;"></div>',
      '</div>'];

    var linkOuts = [
      '<tpl if="trashed==0">',

      '  <tpl if="linkout || doi">',
      '    <div class="pp-box pp-box-side-panel pp-box-bottom pp-box-style1">',
      '    <tpl if="doi">',
      '      <p><a href="#" onClick="Paperpile.utils.openURL(\'http://dx.doi.org/{doi}\');" class="pp-textlink pp-action pp-action-go">Go to Publisher\'s site</a></p>',
      '    </tpl>',
      '    <tpl if="!doi && linkout">',
      '      <p><a href="#" onClick="Paperpile.utils.openURL(\'{linkout}\');" class="pp-textlink pp-action pp-action-go">Go to Publisher\'s site</a></p>',
      '    </tpl>',
      '    </div>',
      '  </tpl>',

      '  <tpl if="!linkout && !doi">',
      '    <div class="pp-box pp-box-side-panel pp-box-bottom pp-box-style2">',
      '      <p class="pp-action-inactive pp-action-go-inactive">No link to publisher available</p>',
      '    </div>',
      '  </tpl>',

      '  <div class="pp-box pp-box-side-panel pp-box-style2"',
      '    <h2>PDF</h2>',
      '    <div id="search-download-widget-{id}" class="pp-search-download-widget"></div>',
      '    <tpl if="_imported || attachments">',
      '      <h2>Supplementary material</h2>',
      '    </tpl>',
      '      <tpl if="_attachments_list">',
      '        <ul class="pp-attachments">',
      '          <tpl for="_attachments_list">',
      '            <li class="pp-attachment-list pp-file-generic {cls}">',
      '            <a href="#" class="pp-textlink" action="open-attachment" path="{path}">{file}</a>&nbsp;&nbsp;',
      '            <a href="#" class="pp-textlink pp-second-link" action="delete-file" guid="{guid}">Delete</a></li>',
      '          </tpl>',
      '       </ul>',
      '    </tpl>',
      '    <tpl if="_imported">',
      '      <ul>',
      '        <li id="attach-file-{id}" class="pp-action pp-action-attach-file"><a href="#" class="pp-textlink" action="attach-file">Attach File</a></li>',
      '      </ul>',
      '    </tpl>',
      '  </div>',
      '</tpl>'];
    return[].concat(prefix, referenceInfo, linkOuts, suffix);
  },

  getEmptyGridTemplate: function() {
    var template = [
      '<div id="main-container-{id}">',
      '  <div class="pp-box pp-box-side-panel pp-box-top pp-box-style2">',
      '    <p class="pp-inactive">No references here.</p>',
      '  </div>',
      '</div>'];
    return[].concat(template);
  },

  getNoSelectionTemplate: function() {
    var template = [
      '<div id="main-container-{id}">',
      '  <div class="pp-box pp-box-side-panel pp-box-top pp-box-style2">',
      '    <p class="pp-inactive">No references selected.</p>',
      '  </div>',
      '</div>'];
    return[].concat(template);
  },

  getMultipleSelectionTemplate: function() {
    var template = [
      '<div id="main-container-{id}">',
      '  <div class="pp-box pp-box-side-panel pp-box-top pp-box-style1">',
      '  <tpl if="numSelected &gt;0">',
      '    <p><b>{numSelected}</b> references selected.</p>',
      '    <div class="pp-vspace" style="height:5px;"></div>',
      '    <ul> ',
      '    <div style="clear:both;"></div>',
      '      <li class="pp-action pp-action-update-metadata"> <a  href="#" class="pp-textlink" action="update-metadata">Update Metadata</a> </li>',
      '      <li class="pp-action pp-action-search-pdf"> <a  href="#" class="pp-textlink" action="batch-download">Download PDFs</a> </li>',
      '      <li class="pp-action pp-action-trash"> <a  href="#" class="pp-textlink" action="delete-ref">Move to Trash</a> </li>',
      '    </ul>',
      '    <div class="pp-vspace" style="height:5px;"></div>',
      '   <dl>',
      '     <dt style="width: 50px;">Labels: </dt>',
      '     <dd style="margin:0 0 0 50px;">',
      '       <div id="label-widget-{id}" class="pp-label-widget"></div>',
      '     </dd>',
      '   </dl>',
      '    <div class="pp-vspace" style="height:5px;"></div>',
      '  </tpl>',
      '  </div>',
      '</div>'];
    return[].concat(template);
  },

  toolbarMenuItemIds: [],

  // This method returns a list of itemIDs in the order we want them
  // to show up in the toolbar.
  // Subclasses or plugins should override this method (making sure to
  // call the superclass method) and add or remove items to / from the
  // this.toolbarMenuItemIds object to alter what shows up in the toolbar.
  initToolbarMenuItemIds: function() {
    this.toolbarMenuItemIds = new Ext.util.MixedCollection();
    this.toolbarMenuItemIds.addAll([
      'TB_FILL',
      'TB_BREAK',
      'VIEW_PDF',
      'OPEN_PDF_FOLDER',
      this.createSeparator('TB_VIEW_SEP'),
      'SELECT_ALL',
      'DELETE',
      this.createSeparator('TB_DEL_SEP'),
      'LIVE_FOLDER',
      'EXPORT_MENU']);
  },

  // Same as above, but for the context menu.
  initContextMenuItemIds: function() {
    this.contextMenuItemIds = new Ext.util.MixedCollection();
    this.contextMenuItemIds.addAll([
    //      'VIEW_PDF',
    //	'OPEN_PDF_FOLDER',
    'PDF_COMBINED_BUTTON',
      this.createContextSeparator('CONTEXT_VIEW_SEP'),
      'EDIT',
      'SELECT_ALL',
      'DELETE',
      this.createContextSeparator('CONTEXT_DEL_SEP'),
      'MORE_FROM_MENU',
      'EXPORT_SELECTION',
      'COPY_FORMATTED',
      this.createContextSeparator('CONTEXT_BIBTEX_SEP'),
      'COPY_BIBTEX_CITATION',
      'COPY_BIBTEX_KEY']);
  },

  createContextSeparator: function(itemId) {
    this.actions[itemId] = new Ext.menu.Separator({
      itemId: itemId
    });
    return itemId;
  },

  createSeparator: function(itemId) {
    this.actions[itemId] = new Ext.Toolbar.Separator({
      itemId: itemId
    });
    return itemId;
  },

  createToolbarMenu: function() {
    var tbar = this.getTopToolbar();
    tbar.removeAll();

    this.initToolbarMenuItemIds();
    var itemIds = this.toolbarMenuItemIds; // This is an Ext.util.MixedCollection.
    for (var i = 0; i < itemIds.length; i++) {
      var id = itemIds.itemAt(i);
      tbar.insert(i, this.actions[id]);
    }
  },

  getContextMenu: function() {
    return this.context;
  },

  createContextMenu: function() {
    this.context = new Ext.menu.Menu({
      id: 'pp-grid-context-' + this.id,
      itemId: 'context'
    });
    var context = this.context;
    this.initContextMenuItemIds();
    var itemIds = this.contextMenuItemIds; // This is an Ext.util.MixedCollection.
    for (var i = 0; i < itemIds.length; i++) {
      var id = itemIds.itemAt(i);
      context.insert(i, this.actions[id]);
    }
  },

  contextRecord: null,
  onContextClick: function(grid, index, e) {
    var record = this.getStore().getAt(index);
    this.contextRecord = record;

    if (!this.getSelectionModel().isSelected(index)) {
      this.getSelectionModel().selectRow(index);
    }

    this.refreshView();
    var xy = e.getXY();
    this.context.showAt.defer(10, this.context, [xy]);
    e.stopEvent();
  },

  updateContextItem: function(menuItem, record) {
    // Recurse through sub-menus.
    if (menuItem.menu) {
      menuItem.menu.items.each(function(item, index, length) {
        this.updateContextItem(item, record);
      },
      this);
    }

    return;
  },

  updateMoreFrom: function() {
    this.actions['MORE_FROM_FIRST_AUTHOR'].setText(this.getFirstAuthorFromSelection());

    if (this.getLastAuthorFromSelection() != '') {
      this.actions['MORE_FROM_LAST_AUTHOR'].setText(this.getLastAuthorFromSelection());
      this.actions['MORE_FROM_LAST_AUTHOR'].show();
    } else {
      //this.actions['MORE_FROM_LAST_AUTHOR'].setText("Last author");
      //this.actions['MORE_FROM_LAST_AUTHOR'].disable();
      this.actions['MORE_FROM_LAST_AUTHOR'].hide();
    }

    var a = this.actions['MORE_FROM_JOURNAL'];
    if (this.getJournalFromSelection() != '') {
      a.show();
      a.setText(this.getJournalFromSelection());
    } else {
      a.hide();
    }
    a.each(function(item) {
      item.style = {
        'font-style': 'italic'
      };
      if (item.rendered) {
        item.textEl.setStyle('font-style', 'italic');
      }
    },
    this);

    a = this.actions['MORE_FROM_YEAR'];
    if (this.getYearFromSelection() != '') {
      a.show();
      a.setText(this.getYearFromSelection());
    } else {
      a.hide();
    }

  },

  // Private. Don't override.
  updateButtons: function() {
    this.getTopToolbar().items.each(function(item, index, length) {
      item.enable();
    });
    this.getContextMenu().items.each(function(item, index, length) {
      item.enable();
    });

    var selection = this.getSingleSelectionRecord();

    this.actions['SELECT_ALL'].setText('Select All (' + this.getStore().getTotalCount() + ')');
    if (this.allSelected || this.getTotalCount() == 0) {
      this.actions['SELECT_ALL'].disable();
    }

    if (!selection || selection.data.pdf == '') {
      this.actions['VIEW_PDF'].disable();
      this.actions['OPEN_PDF_FOLDER'].disable();
    }

    if (!selection) {
      this.actions['EDIT'].disable();
      this.actions['DELETE'].disable();
    }

    if (selection) {
      this.updateMoreFrom();
    }

    var tbar = this.getTopToolbar();
    var context = this.getContextMenu();

    context.getComponent('EXPORT_SELECTION').setText("Export Selection...");

    var settings = Paperpile.main.globalSettings['bibtex'];
    if (settings.bibtex_mode == 1) {
      this.getContextByItemId('COPY_BIBTEX_CITATION').show();
      this.getContextByItemId('COPY_BIBTEX_KEY').show();
      this.getContextByItemId('CONTEXT_BIBTEX_SEP').show();
    } else {
      this.getContextByItemId('COPY_BIBTEX_CITATION').hide();
      this.getContextByItemId('COPY_BIBTEX_KEY').hide();
      this.getContextByItemId('CONTEXT_BIBTEX_SEP').hide();
    }
  },

  updateToolbarItem: function(menuItem) {
    return;
  },

  getToolbarByItemId: function(itemId) {
    var tbar = this.getTopToolbar();
    return tbar.items.itemAt(this.getButtonIndex(itemId));
  },

  getContextByItemId: function(itemId) {
    return this.getContextMenu().items.itemAt(this.getContextIndex(itemId));
  },

  // Small helper functions to get the index of a given item in the toolbar configuration array
  // We have to use the text instead of itemId. Actions do not seem to support itemIds.
  // A better solution should be possible with ExtJS 3
  getContextIndex: function(itemId) {
    var context = this.getContextMenu();
    for (var i = 0; i < context.items.length; i++) {
      var item = context.items.itemAt(i);
      if (item.itemId == itemId) return i;
    }
    return -1;
  },

  getTopToolbar: function() {
    var tbar = Paperpile.PluginGrid.superclass.getTopToolbar.call(this);
    if (tbar == null) {
      tbar = this._tbar;
    }
    return tbar;
  },

  getButtonIndex: function(itemId) {
    var tbar = this.getTopToolbar();
    for (var i = 0; i < tbar.items.length; i++) {
      var item = tbar.items.itemAt(i);
      if (item.itemId == itemId) return i;
    }
    return -1;
  },

  getPluginPanel: function() {
    return this.findParentByType(Paperpile.PluginPanel);
  },

  getSelectionAsList: function(what) {
    if (!what) what = 'ALL';
    var selection = [];
    this.getSelectionModel().each(
      function(record) {
        if ((what == 'ALL') || (what == 'IMPORTED' && record.get('_imported')) || (what == 'NOT_IMPORTED' && !record.get('_imported'))) {
          selection.push(record.get('guid'));
        }
      });
    return selection;
  },

  // Returns list of guids for the selected entries, either ALL, IMPORTED, NOT_IMPORTED
  getSelection: function(what) {
    if (this.allSelected) {
      return 'ALL';
    } else {
      return this.getSelectionAsList(what);
    }
  },

  getSelectionCount: function() {
    var sm = this.getSelectionModel();
    var numSelected = sm.getCount();
    if (this.allSelected) {
      numSelected = this.getStore().getTotalCount();
    }
    return numSelected;
  },

  getTotalCount: function() {
    return this.getStore().getTotalCount();
  },

  // Some plugins use a two-stage process for showing entries: First
  // only minimal info is scraped from site to build list quickly
  // without harassing the site too much. Then the details are
  // fetched only when user clicks the entry.
  completeEntry: function() {
    var selection = this.getSelection();

    var sel = this.getSelectionModel().getSelected();
    if (!sel) return;
    var data = sel.data;
    // _details_link indicates if an entry still needs to be completed or not
    if (data._details_link) {

      this.lookingUpData = true;

      // Don't allow other rows to be selected during load
      var blockingFunction = function() {
        return false;
      };
      this.getSelectionModel().on('beforerowselect', blockingFunction, this);

      var guid = this.getSelectionModel().getSelected().data.guid;

      Paperpile.status.updateMsg({
        busy: true,
        msg: 'Lookup bibliographic data',
        action1: 'Cancel',
        callback: function() {
          Ext.Ajax.abort(transactionID);
          this.cancelCompleteEntry();
          Paperpile.status.clearMsg();
          this.getSelectionModel().un('beforerowselect', blockingFunction, this);
        },
        scope: this
      });

      // Warn after 10 sec
      this.timeoutWarn = (function() {
        Paperpile.status.setMsg('This is taking longer than usual. Still looking up data.');
      }).defer(10000, this);

      // Abort after 20 sec
      this.timeoutAbort = (function() {
        Ext.Ajax.abort(transactionID);
        this.cancelCompleteEntry();
        Paperpile.status.clearMsg();
        Paperpile.status.updateMsg({
          type: 'error',
          msg: 'Giving up. There may be problems with your network or ' + this.plugin_name + '.',
          hideOnClick: true
        });
        this.getSelectionModel().un('beforerowselect', blockingFunction, this);
      }).defer(20000, this);

      var transactionID = Ext.Ajax.request({
        url: Paperpile.Url('/ajax/crud/complete_entry'),
        params: {
          selection: selection,
          grid_id: this.id,
          cancel_handle: this.id + '_lookup',
        },
        method: 'GET',
        success: function(response) {
          var json = Ext.util.JSON.decode(response.responseText);

          this.getSelectionModel().un('beforerowselect', blockingFunction, this);

          clearTimeout(this.timeoutWarn);
          clearTimeout(this.timeoutAbort);

          if (json.error) {
            Paperpile.main.onError(response);
            return;
          }

          Paperpile.main.onUpdate(json.data);
          Paperpile.status.clearMsg();

          this.updateButtons();
          this.getPluginPanel().updateDetails();

        },
        failure: function(response) {
          this.getSelectionModel().un('beforerowselect', blockingFunction, this);
          clearTimeout(this.timeoutWarn);
          clearTimeout(this.timeoutAbort);
          Paperpile.main.onError(response);
        },
        scope: this
      });
    }
  },

  cancelCompleteEntry: function() {

    clearTimeout(this.timeoutWarn);
    clearTimeout(this.timeoutAbort);

    Ext.Ajax.request({
      url: Paperpile.Url('/ajax/misc/cancel_request'),
      params: {
        cancel_handle: this.id + '_lookup',
        kill: 1,
      },
    });
  },

  updateDetail: function() {
    // Override with other plugin methods to do things necessary on detail update.
  },

  // If trash is set entries are moved to trash, otherwise they are
  // deleted completely
  // mode: TRASH ... move to trash
  //       RESTORE ... restore from trash
  //       DELETE ... delete permanently
  handleDelete: function() {
    this.deleteEntry('TRASH');
  },

  handleSaveActive: function() {
    Paperpile.main.tree.newActive();
  },

  handleExportSelection: function() {
    selection = this.getSelection();
    var window = new Paperpile.SimpleExportWindow({
      grid_id: this.id,
      selection: selection
    });
    window.show();
  },

  handleExportView: function() {
    var window = new Paperpile.SimpleExportWindow({
      grid_id: this.id,
      selection: 'all'
    });
    window.show();
  },

  handleCopy: function(module, format, msg) {
    Ext.Ajax.request({
      url: Paperpile.Url('/ajax/plugins/export'),
      params: {
        grid_id: this.id,
        selection: this.getSelection(),
        export_name: module,
        export_out_format: format,
        get_string: true
      },
      method: 'GET',
      success: function(response) {
        var json = Ext.util.JSON.decode(response.responseText);
        Paperpile.status.clearMsg();
        if (IS_TITANIUM) {
          Titanium.UI.Clipboard.setText(json.data.string);
          Paperpile.status.updateMsg({
            msg: msg,
            duration: 1.5
          });
        } else {
          // TODO: Figure out a non-Titanium way to handle this.
        }
      },
      scope: this,
      failure: function(response) {
        Paperpile.main.onError(response);
      }
    });
  },
  handleCopyBibtexCitation: function() {
    this.handleCopy('Bibfile', 'BIBTEX', 'BibTeX copied');
  },
  handleCopyBibtexKey: function() {
    this.handleCopy('Bibfile', 'CITEKEYS', 'LaTeX citations copied');
  },
  handleCopyFormatted: function() {
    this.handleCopy('Bibfile', 'CITATIONS', 'Citations copied');
  },
  deleteEntry: function(mode) {
    var selection = this.getSelection();
    var index = this.getStore().indexOf(this.getSelectionModel().getSelected());
    var many = false;

    if (mode == 'DELETE') {
      Paperpile.status.showBusy('Deleting references from library');
    }
    if (mode == 'TRASH') {
      Paperpile.status.showBusy('Moving references to Trash');
    }

    if (mode == 'RESTORE') {
      Paperpile.status.showBusy('Restoring references');
    }

    Ext.Ajax.request({
      url: Paperpile.Url('/ajax/crud/delete_entry'),
      params: {
        selection: selection,
        grid_id: this.id,
        mode: mode
      },
      method: 'GET',
      timeout: 10000000,
      success: function(response) {
        var data = Ext.util.JSON.decode(response.responseText);
        var num_deleted = data.num_deleted;

        Paperpile.main.onUpdate(data.data);

        if (mode == 'TRASH') {
          var msg = num_deleted + ' references moved to Trash';
          if (num_deleted == 1) {
            msg = "1 reference moved to Trash";
          }

          Paperpile.status.updateMsg({
            msg: msg,
            action1: 'Undo',
            callback: function(action) {
              // TODO: does not show up, don't know why:
              Paperpile.status.showBusy('Undo...');
              Ext.Ajax.request({
                url: Paperpile.Url('/ajax/crud/undo_trash'),
                method: 'GET',
                success: function(response) {
                  var json = Ext.util.JSON.decode(response.responseText);
                  Paperpile.main.onUpdate(json.data);
                  Paperpile.status.clearMsg();
                },
                scope: this
              });
            },
            scope: this,
            hideOnClick: true
          });
        } else {
          Paperpile.status.clearMsg();
        }
      },
      failure: Paperpile.main.onError,
      scope: this
    });

  },

  handleEdit: function(isNew) {

    var selection = this.getSelectionModel().getSelected();

    if (selection) {
      var rowid = selection.get('_rowid');
      var guid = selection.data.guid;
    }

    win = new Ext.Window({
      title: isNew ? 'Add new reference' : 'Edit reference',
      modal: true,
      shadow: false,
      layout: 'fit',
      width: 800,
      height: 600,
      resizable: false,
      closable: true,
      items: [new Paperpile.MetaPanel({
        data: isNew ? {
          pubtype: 'ARTICLE'
        } : this.getSelectionModel().getSelected().data,
        grid_id: isNew ? null : this.id,
        callback: function(status, data) {
          if (status == 'SAVE') {
            Paperpile.main.onUpdate(data);
            Paperpile.status.clearMsg();
          }
          win.close();
        },
        scope: this
      })],
    });

    win.show(this);
  },

  updateMetadata: function() {
    var selection = this.getSelection();
    Ext.getCmp('queue-widget').onUpdate({
      submitting: true
    });
    Ext.Ajax.request({
      url: Paperpile.Url('/ajax/crud/batch_update'),
      params: {
        selection: selection,
        grid_id: this.id
      },
      method: 'GET',
      success: function(response) {
        var json = Ext.util.JSON.decode(response.responseText);
        Paperpile.main.onUpdate(json.data);
        // Trigger a thread to start requesting queue updates.
        Paperpile.main.queueUpdate();
      },
      failure: Paperpile.main.onError,
    });
  },

  batchDownload: function() {
    selection = this.getSelection();
    Ext.getCmp('queue-widget').onUpdate({
      submitting: true
    });
    Ext.Ajax.request({
      url: Paperpile.Url('/ajax/crud/batch_download'),
      params: {
        selection: selection,
        grid_id: this.id
      },
      method: 'GET',
      success: function(response) {
        var json = Ext.util.JSON.decode(response.responseText);
        Paperpile.main.onUpdate(json.data);
        // Trigger a thread to start requesting queue updates.
        Paperpile.main.queueUpdate();
      },
      failure: Paperpile.main.onError,
    });
  },

  cancelDownload: function() {
    var selected_id = this.getSelectionModel().getSelected().data._search_job.id;
    Ext.Ajax.request({
      url: Paperpile.Url('/ajax/queue/cancel_jobs'),
      params: {
        ids: selected_id
      },
      method: 'GET',
      success: function(response) {
        var json = Ext.util.JSON.decode(response.responseText);
        Paperpile.main.onUpdate(json.data);
      },
      failure: Paperpile.main.onError
    });
  },

  retryDownload: function() {
    var selected_id = this.getSelectionModel().getSelected().data._search_job.id;
    Ext.Ajax.request({
      url: Paperpile.Url('/ajax/queue/retry_jobs'),
      params: {
        ids: selected_id
      },
      method: 'GET',
      success: function(response) {
        var json = Ext.util.JSON.decode(response.responseText);
        Paperpile.main.onUpdate(json.data);
        Paperpile.main.queueJobUpdate();
      },
      failure: Paperpile.main.onError,
    });

    // TODO: Do a more immediate update to the record so we don't have a delay there.
  },

  clearDownload: function() {
    var selected_id = this.getSelectionModel().getSelected().data._search_job.id;
    Ext.Ajax.request({
      url: Paperpile.Url('/ajax/queue/remove_jobs'),
      params: {
        ids: selected_id
      },
      method: 'GET',
      success: function(response) {
        var json = Ext.util.JSON.decode(response.responseText);
        Paperpile.main.onUpdate(json.data);
      },
      failure: Paperpile.main.onError,
    });

    // TODO: Do a more immediate update to the record so we don't have a delay there.
  },

  formatEntry: function() {

    selection = this.getSelection();

    Paperpile.main.tabs.add(new Paperpile.Format({
      grid_id: this.id,
      selection: selection
    }));
  },

  updateTagStyles: function() {
    // Go through each record and re-render it if it has some improperly styled tags.
    var n = this.getStore().getCount();
    for (var i = 0; i < n; i++) {
      var record = this.getStore().getAt(i);
      if (record.get('tags')) {
        this.getStore().fireEvent('update', this.getStore(), record, Ext.data.Record.EDIT);
      }
    }

    var overview = this.getPluginPanel().getOverview();
    overview.forceUpdate();
  },

  // Update specific fields of specific entries to avoid complete
  // reload of everything.
  onUpdate: function(data) {
    var pubs = data.pubs;
    if (!pubs) {
      return;
    }

    var store = this.getStore();
    var selected_guid = '';
    var sel = this.getSingleSelectionRecord();
    if (sel) selected_guid = sel.data.guid;

    var updateSidePanel = false;
    for (var guid in pubs) {
      var record = store.getAt(store.findExact('guid', guid));
      if (!record) {
        continue;
      }
      var needsUpdating = false;
      var update = pubs[guid];
      record.editing = true; // Set the 'editing' flag.
      for (var field in update) {
        record.set(field, update[field]);
      }

      // Unset the 'editing' flag. Using the flag directly avoids calling store.afterEdit() for every record.
      record.editing = false;
      if (record.dirty) {
        needsUpdating = true;
        if (guid == selected_guid) updateSidePanel = true;
      }

      if (needsUpdating) {
        store.fireEvent('update', store, record, Ext.data.Record.EDIT);
      }
    }

    if (data.updateSidePanel) updateSidePanel = true;
    if (updateSidePanel) {
      this.refreshView.defer(20, this);
    }
  },

  selectAll: function() {
    this.allSelected = true;
    this.getSelectionModel().selectAll();
    this.getSelectionModel().on('selectionchange',
      function(sm) {
        this.allSelected = false;
      },
      this, {
        single: true
      });
    this.getSelectionModel().on('rowdeselect',
      function(sm) {
        sm.clearSelections();
      },
      this, {
        single: true
      });

  },

  setSearchQuery: function() {
    // To be implemented by subclasses.
  },

  getSingleSelectionRecord: function() {
    if (this.contextRecord != null) {
      return this.contextRecord;
    } else {
      return this.getSelectionModel().getSelected();
    }
  },

  getFirstAuthorFromSelection: function() {
    var authors = this.getSingleSelectionRecord().data.authors || '';
    var arr = authors.split(/\s+and\s+/);
    var author = '';
    if (arr.length > 0) {
      author = arr[0];
    }
    return author;
  },

  getLastAuthorFromSelection: function() {
    var authors = this.getSingleSelectionRecord().data.authors || '';
    // Remove author entries enclosed in brackets, e.g. {et al.}
    authors = authors.replace(/{.*}/g, "");
    var arr = authors.split(/\s+and\s+/);
    var author = '';
    if (arr.length > 1) {
      author = arr[arr.length - 1];
    }
    return author;
  },

  getJournalFromSelection: function() {
    var journal = this.getSingleSelectionRecord().data.journal || '';
    return journal;
  },

  getYearFromSelection: function() {
    var year = this.getSingleSelectionRecord().data.year || '';
    return year;
  },

  moreFromLastAuthor: function() {
    var authors = this.getSingleSelectionRecord().data._authors_display || '';
    var arr = authors.split(/,\s+/);
    var author = '';
    if (arr.length > 0) {
      author = arr[arr.length - 1];
    }
    this.setSearchQuery('author:' + '"' + author + '"');
  },

  moreFromFirstAuthor: function() {
    var authors = this.getSingleSelectionRecord().data._authors_display || '';
    var arr = authors.split(/,\s+/);
    var author = '';
    if (arr.length > 0) {
      author = arr[0];
    }
    this.setSearchQuery('author:' + '"' + author + '"');
    /*
 	Paperpile.main.tabs.newPluginTab('DB',
					 {plugin_mode:'FULLTEXT',
					 plugin_query:'author:'+'"'+first_author+'"'},
					 first_author,
					 '',
					 first_author
					);
    */
  },
  moreFromYear: function() {
    var year = this.getYearFromSelection();
    if (year) {
      this.setSearchQuery('year:' + '"' + year + '"');
      /*	Paperpile.main.tabs.newPluginTab('DB',
					 {plugin_mode:'FULLTEXT',
					 plugin_query:'year:'+'"'+year+'"'},
					 year,
					 '',
					 year
					);
*/
    }
  },
  moreFromJournal: function() {
    var journal = this.getJournalFromSelection();
    if (journal) {
      this.setSearchQuery('journal:' + '"' + journal + '"');
      /*	Paperpile.main.tabs.newPluginTab('DB',
					 {plugin_mode:'FULLTEXT',
					 plugin_query:'journal:'+'"'+journal+'"'},
					 journal,
					 '',
					 journal
					);
*/
    }
  },

  openPDFFolder: function() {
    var sm = this.getSelectionModel();
    if (sm.getSelected().data.pdf) {
      var pdf = sm.getSelected().data.pdf_name;
      var path = Paperpile.utils.catPath(Paperpile.main.globalSettings.paper_root, pdf);
      var parts = Paperpile.utils.splitPath(path);
      // Need to defer this call, otherwise the context menu jumps to the upper-left side of screen... no idea why but this works!
      Paperpile.utils.openFile.defer(20, Paperpile.utils, [parts.dir]);
    }
  },

  openPDF: function() {
    var sm = this.getSelectionModel();
    if (sm.getSelected().data.pdf) {
      var pdf = sm.getSelected().data.pdf_name;
      var path = Paperpile.utils.catPath(Paperpile.main.globalSettings.paper_root, pdf);
      Paperpile.main.tabs.newPdfTab({
        file: path,
        title: pdf
      });
      Paperpile.main.inc_read_counter(sm.getSelected().data);
    }
  },

  reloadFeed: function() {
    this.plugin_reload = 1;
    this.getStore().reload();
  },

  onDblClick: function(grid, rowIndex, e) {
    var sm = this.getSelectionModel();
    if (sm.getCount() == 1) {
      if (sm.getSelected().data._imported) {
        this.openPDF();
      }
    }
  },

  onClose: function(cont, comp) {
    Ext.Ajax.request({
      url: Paperpile.Url('/ajax/plugins/delete_grid'),
      params: {
        grid_id: this.id
      },
      method: 'GET'
    });
  },

  destroy: function() {
    Paperpile.PluginGrid.superclass.destroy.call(this);

    if (this._store) {
      this._store.destroy();
    }

    if (this.context) {
      this.context.destroy();
    }
  }
});

Paperpile.GridDropZone = function(grid, config) {
  this.grid = grid;
  Paperpile.GridDropZone.superclass.constructor.call(this, grid.view.scroller.dom, config);
};

Ext.extend(Paperpile.GridDropZone, Ext.dd.DropZone, {
  getTargetFromEvent: function(e) {
    return e.getTarget(this.grid.getView().rowSelector);
  },

  onNodeEnter: function(target, dd, e, data) {},

  onNodeOver: function(target, dd, e, data) {
    return this.grid.onNodeOver(target, dd, e, data);
  },

  onNodeDrop: function(target, dd, e, data) {
    var retVal = this.grid.onNodeDrop(target, dd, e, data);
    return retVal;
  },

  destroy: function() {
    Paperpile.GridDropZone.superclass.destroy.call();
    this.grid = null;
  },
  containerScroll: true
});

Ext.reg('pp-plugin-grid', Paperpile.PluginGrid);
/*
// Saving this one for later -- we could try and do some nice animation features when the user does batch imports using this code.
Ext.grid.AnimatedGridView = Ext.extend(Ext.grid.GridView, {
  initComponent: function() {
    Ext.grid.AnimatedGridView.superclass.initComponent.apply(this, arguments);
  },
  insertRows: function(dm, firstRow, lastRow, isUpdate) {
    Ext.grid.AnimatedGridView.superclass.insertRows.apply(this, arguments);
    var rowAdded = Ext.get(this.getRow(firstRow));
    if (rowAdded) {
      rowAdded.slideIn();
    }
  },
  removeRow: function(rowIndex) {
    var rowToRemove = Ext.get(this.getRow(rowIndex));
    var gridView = this;

    rowToRemove.slideOut('t', {
      remove: true
    });
  }
});
*/

Paperpile.Pager = Ext.extend(Ext.PagingToolbar, {
  initComponent: function() {
    Paperpile.Pager.superclass.initComponent.call(this);

    var items = [this.first, this.inputItem, this.afterTextItem, this.last, this.refresh];
    Paperpile.log(items.length);
    items = items.concat(this.findByType(Ext.Toolbar.Spacer));
    items = items.concat(this.findByType(Ext.Toolbar.Separator));
    Paperpile.log(items.length);
    for (var i = 0; i < items.length; i++) {
      this.remove(items[i], true);
    }

    var pageText = this.findBy(function(item, container) {
      if (item.text == this.beforePageText) {
        return true;
      }
    },
    this);
    //('text',this.beforePageText);
    this.remove(1, true);

    this.on('render', this.myOnRender, this);
  },
  myOnRender: function() {
    this.progressBar = new Ext.ProgressBar({
      text: '',
      width: 50,
      height: 10,
      animate: {
        duration: 1,
        easing: 'easeOutStrong'
      },
      cls: 'pp-toolbar-progress'
    });
    this.progressBar.on('render', function(pb) {
      this.mon(pb.getEl(), 'click', this.handleProgressBarClick, this);
    },
    this);
    this.insert(2, this.progressBar);
    this.insert(2, new Ext.Toolbar.Spacer({
      width: 5
    }));
  },
  handleProgressBarClick: function(e) {
    var box = this.progressBar.getBox();
    var xy = e.getXY();
    var position = xy[0] - box.x;
    var pages = Math.ceil(this.store.getTotalCount() / this.pageSize);
    var newpage = Math.ceil(position / (this.progressBar.width / pages));
    this.changePage(newpage);
  },
  updateInfo: function() {
    Paperpile.Pager.superclass.updateInfo.call(this);
    var count = this.store.getCount();
    var pgData = this.getPageData();
    var pageNum = this.readPage(pgData);
    pageNum = pgData.activePage;
    var high = pageNum / pgData.pages;
    var low = (pageNum - 1) / pgData.pages;
      this.progressBar.updateRange(low, high, '');
      if (high == 1 && low == 0) {
	  this.progressBar.disable();
	  this.progressBar.getEl().applyStyles('cursor:normal');
      } else {
	  this.progressBar.enable();
	  this.progressBar.getEl().applyStyles('cursor:pointer');
      }
  }
});