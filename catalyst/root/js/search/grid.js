Paperpile.PluginGrid = Ext.extend(Ext.grid.GridPanel, {

    plugin_query:'',
    closable:true,
    region:'center',
    limit: 25,

    initComponent:function() {

        var _store=new Ext.data.Store(
            {  proxy: new Ext.data.HttpProxy({
                url: '/ajax/grid/resultsgrid', 
                method: 'GET'
            }),
               baseParams:{grid_id: this.id,
                           plugin_file: this.plugin_file,
                           plugin_name: this.plugin_name,
                           plugin_query: this.plugin_query,
                           plugin_mode: this.plugin_mode,
                           limit:this.limit
                          },
               reader: new Ext.data.JsonReader(),
            }); 
        
        var _pager=new Ext.PagingToolbar({
            pageSize: this.limit,
            store: _store,
            displayInfo: true,
            displayMsg: 'Displaying papers {0} - {1} of {2}',
            emptyMsg: "No papers to display",
        });
    
        var renderPub=function(value, p, record){

            var t = new Ext.Template(
                '<p class="pp-grid-title">{title}</p>',
                '<p class="pp-grid-authors">{authors}</p>',
                '<p class="pp-grid-citation">{citation}</p>'
            );
            return t.apply({title:record.data.title,
                            authors:record.data._authors_display,
                            citation:record.data._citation_display,
                           });
        }
    
        Ext.apply(this, {
            ddGroup  : 'gridDD',
            enableDragDrop   : true,
            itemId:'grid',
            store: _store,
            bbar: _pager,
            autoExpandColumn:'publication',
            columns:[{header: '',
                      renderer: function(value, metadata,record, rowIndex,colIndex,store){
                          if (record.data._imported){
                              return '<div class="pp-status-imported"></div>';
                          } else {
                              return '';
                          }
                      },
                      width: 36,
                     },
                     {header: '',
                      renderer: function(value, metadata,record, rowIndex,colIndex,store){
                          if (record.data.pdf){
                              return '<div class="pp-status-pdf"></div>';
                          } else {
                              return '';
                          }
                      },
                      width: 36,
                     },
                     {header: "Publication",
                      id: 'publication',
                      dataIndex: 'title',
                      renderer:renderPub,
                     }
                    ],
            
        });
        
        Paperpile.PluginGrid.superclass.initComponent.apply(this, arguments);

        
        this.on('beforedestroy', this.onDestroy,this);

    },

    afterRender: function(){

        var container= this.findParentByType(Paperpile.PubView);
        this.getSelectionModel().on('rowselect',container.onRowSelect,container);
        Paperpile.PluginGrid.superclass.afterRender.apply(this, arguments);

    },

    
    insertEntry: function(){
        
        var sha1=this.getSelectionModel().getSelected().id;
        Ext.Ajax.request({
            url: '/ajax/crud/insert_entry',
            params: { sha1: sha1,
                      grid_id: this.id,
                    },
            method: 'GET',
            success: function(){
                Ext.getCmp('statusbar').clearStatus();
                Ext.getCmp('statusbar').setText('Entry Inserted.');
                this.store.getById(sha1).set('_imported',1);
            },
            scope:this
        });

    },

    deleteEntry: function(){
        
        var rowid=this.getSelectionModel().getSelected().get('_rowid');
        var sha1=this.getSelectionModel().getSelected().id;

        Ext.Ajax.request({
            url: '/ajax/crud/delete_entry',
            params: { rowid: rowid,
                      grid_id: this.id,
                    },
            method: 'GET',
            success: function(){
                Ext.getCmp('statusbar').clearStatus();
                Ext.getCmp('statusbar').setText('Entry deleted.');
            },
        });

        this.store.remove(this.store.getById(sha1));
    },

    editEntry: function(){
        
        var rowid=this.getSelectionModel().getSelected().get('_rowid');
        var sha1=this.getSelectionModel().getSelected().id;

        //var form = new Paperpile.Forms.Settings();

        var form=new Paperpile.Forms.PubEdit({data:this.getSelectionModel().getSelected().data,
                                              grid_id: this.id,
                                             });

        var east_panel=this.findParentByType(Ext.PubView).items.get('east_panel');
        
        east_panel.hideBbar();
        east_panel.add(form);
        east_panel.doLayout();
        east_panel.getLayout().setActiveItem('pub_edit');

    },

    newEntry: function(){

        var form=new Paperpile.Forms.PubEdit({data:{pubtype:'ARTICLE'}, grid_id: null });

        var east_panel=this.findParentByType(Ext.PubView).items.get('east_panel');
        
        east_panel.hideBbar();
        east_panel.add(form);
        east_panel.doLayout();
        east_panel.getLayout().setActiveItem('pub_edit');

    },

    onDestroy: function(cont, comp){
        Ext.Ajax.request({
            url: '/ajax/grid/delete_grid',
            params: { grid_id: this.id,
                    },
            method: 'GET'
        });
    },
});







