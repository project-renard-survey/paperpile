PaperPile.DataTabs = Ext.extend(Ext.Panel, {

    initComponent:function() {
        
        Ext.apply(this, {
            itemId: 'data_tabs',
            layout:'card',
            margins: '2 2 2 2',
            items:[{xtype:'pubsummary',
                    id: 'pubsummary',
                    itemId:'pubsummary',
                    border: true,
                    height:200
                   },
                   {xtype:'pubnotes',
                    id: 'pubnotes',
                    itemId:'pubnotes',
                    border: true,
                    height:200
                   }
                  ],
            bbar: [{ text: 'Summary',
                     id: 'summary_tab_button',
                     enableToggle: true,
                     toggleHandler: this.onItemToggle,
                     toggleGroup: 'tab_buttons',
                     allowDepress : false,
                     pressed: true
                   },
                   { text: 'Notes',
                     id: 'notes_tab_button',
                     enableToggle: true,
                     toggleHandler: this.onItemToggle,
                     toggleGroup: 'tab_buttons',
                     allowDepress : false,
                     pressed: false
                   },
                   { text: 'Save',
                     id: 'save_notes_button',
                     listeners: {
                         click:  { fn: function()
                                   {
                                       Ext.getCmp('pubnotes').onSave();
                                   },
                                   scope: Ext.getCmp('pubnotes')}
                     },

                     hidden:true
                   },
                   { text: 'Cancel',
                     id: 'cancel_notes_button',
                     listeners: {
                         click:  { fn: function()
                                   {
                                       Ext.getCmp('pubnotes').onCancel();
                                   },
                                   scope: Ext.getCmp('pubnotes')}
                     },
                     hidden:true
                   },

                  ]
        });
       
        PaperPile.DataTabs.superclass.initComponent.apply(this, arguments);
    },

    onItemToggle:function (button, pressed){

        if (button.id == 'summary_tab_button' && pressed){
            Ext.getCmp('data_tabs').layout.setActiveItem('pubsummary');
        }

        if (button.id == 'notes_tab_button' && pressed){
            Ext.getCmp('data_tabs').layout.setActiveItem('pubnotes');
        }

    }
    
}                                 
 
);

Ext.reg('datatabs', PaperPile.DataTabs);