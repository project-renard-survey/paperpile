Paperpile.Forms.PubEdit = Ext.extend(Paperpile.Forms, {
	  
    initComponent: function() {

        this.pub_types=Paperpile.main.globalSettings.pub_types;

        var _type_store=[];

        // Give the sorted list of publication types here
        var list=['ARTICLE','BOOK','INCOLLECTION','INBOOK',
                  'PROCEEDINGS', 'INPROCEEDINGS', 
                  'MASTERSTHESIS', 'PHDTHESIS',
                  'MANUAL', 'UNPUBLISHED','MISC'];
                  
        for (var i=0;i<list.length;i++){
            _type_store.push([list[i],this.pub_types[list[i]].name]);
        }

    	Ext.apply(this, {
            itemId:'pub_edit',
            defaultType:'textfield',
            labelAlign:'right',
            defaults:{
                width:320
            },
            frame:true,
            border:0,
            items:[
                {xtype:'combo',
                 itemId:'pubtype',
                 editable:false,
                 forceSelection:true,
                 triggerAction: 'all',
                 disableKeyFilter: true,
                 fieldLabel:'Type',
                 mode: 'local',
                 minListWidth:320,
                 store: _type_store,
                 hiddenName: 'pubtype',
                 listeners: {
                     select: {
                         fn: function(combo,record,indec){
                             this.setFields(record.data.value);
                         },
                         scope:this,
                     }
                 }
                },
                {name:'title',xtype:'textarea',height:'70'},
                {name:'authors', xtype:'textarea',height:'70'},
                {name:'booktitle'},
                {name:'series'},
                {name:'editors'},
                {name:'howpublished'},
                {name:'school'},
                {name:'journal'},
                {name:'chapter'},
                {name:'edition'},
                {name:'volume', width:100},
                {name:'issue', width:100},
                {name:'pages', width:100},
                {name:'year', width:100},
                {name:'month', width:100},
                {name:'day', width:100},
                {name:'publisher'},
                {name:'organization'},
                {name:'address'},
                {name:'issn', width:100},
                {name:'isbn', width:100},
                {name:'pmid', width:100},
                {name:'doi'},
                {name:'url'},
                {name:'abstract', xtype:'textarea', height:'100'},
            ],

            bbar:[{xtype:'tbfill'},
                  new Ext.Button({
                      id: 'edit_save_button',
                      text: 'Save',
                      cls: 'x-btn-text-icon save',
                      listeners: {
                          click:  {fn: this.save, scope: this}
                      },
                  }),
                  new Ext.Button({
                      id: 'edit_cancel_button',
                      text: 'Cancel',
                      cls: 'x-btn-text-icon cancel',
                      listeners: {
                          click:  {fn: this.cancel, scope: this}
                      },
                  }),
                 ],
		});

        Paperpile.Forms.PubEdit.superclass.initComponent.call(this);
        
        this.setValues(this.data);

        this.on('afterlayout',
                function(){
                    this.setFields('ARTICLE');
                });
              
	  },
    
    setValues : function(values){
        for (var i = 0, items = this.items.items, len = items.length; i < len; i++) {
            var field = items[i];
            var v = values[field.id] || values[field.hiddenName || field.name];
            if (typeof v !== 'undefined') {
                field.setValue(v)
                if(this.trackResetOnLoad){
                    field.originalValue = field.getValue();
                }
            }
        }
    },

    setFields : function(pubtype){

        var items=this.items.items;

        /* first set labels and hide everything */
        for (var i=0; i<items.length; i++){
            var el=items[i].getEl();
            if (items[i].itemId == 'pubtype'){
                continue;
            }
            if (this.pub_types[pubtype].fields[items[i].getName()]){
                var label=this.pub_types[pubtype].fields[items[i].getName()].label;
                if (label){
                    items[i].setFieldLabel(label);
                }
            }
            el.up('div.x-form-item').setDisplayed(false);
        }

        /* then selectively show fields for current publication type */

        for (var f in  this.pub_types[pubtype].fields){
            var field=this.getForm().findField(f);
            if (field){
                el=field.getEl();
                el.up('div.x-form-item').setDisplayed(true);
            }
        }
    },
    
    save: function(){
        // Masks form instead of whole window, should set to dedicated
        // notification area later
        
        this.getForm().waitMsgTarget=true;
        
        var url;
        var params;

        // If we are given a grid_id we are updating an entry
        if (this.grid_id){
            url='/ajax/crud/update_entry';
            params={rowid:this.data._rowid,
                    sha1:this.data.sha1,
                    grid_id: this.grid_id,
                   };
        } 
        // else we are creating a new one
        else {
            url='/ajax/crud/new_entry';
            params:{};
        }

        this.getForm().submit(
            {   url:url,
                scope:this,
                success:this.onSuccess,
                params: params,
                waitMsg:'Saving...',
            }
        );
    },

    cancel: function(){
        this.close();
    },

    onSuccess: function(form,action){
        this.close();
    },

    close: function(){
        
        var east_panel=this.findParentByType(Ext.PubView).items.get('east_panel');

        east_panel.remove('pub_edit');
        east_panel.doLayout();
        east_panel.getLayout().setActiveItem('pdf_manager');
        east_panel.showBbar();
        

    }
    

});
