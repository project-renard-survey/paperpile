Ext.define('Paperpile.pub.panel.Collections', {
  extend: 'Ext.Component',
  alias: 'widget.Collections',
  initComponent: function() {
    Ext.apply(this, {
      tpl: this.createTemplate()
    });
  },

  setPublication: function(pub) {
    this.pub = pub;
    this.update(pub.data);
  },

  createTemplate: function() {
    return new Ext.XTemplate(
      '<div class="pp-box pp-box-side-panel pp-box-top pp-box-style1">',
      '<h2>Folders and Labels</h2>',
      '<tpl if="folders">',
      '  <dt>Folders: </dt>',
      '  <dd>',
      '    <ul class="pp-folders">',
      '    <tpl for="this.getFoldersList(folders)">',
      '      <li class="pp-folder-list pp-folder-generic">',
      '        <a href="#" class="pp-textlink" action="OPEN_FOLDER" args="{id}" >{name}</a> &nbsp;&nbsp;',
      '        <a href="#" class="pp-textlink pp-second-link" action="REMOVE_FOLDER" args="{id}">Remove</a>',
      '      </li>',
      '    </tpl>',
      '    </ul>',
      '  </dd>',
      '</tpl>',
      '  <div style="clear:left;"></div>',
      '</div>', {
        getFoldersList: function(folders) {
          var guids = folders.split(',');
          var store = Ext.getStore('folders');
          var data = [];
          Ext.each(guids, function(guid) {
            if (guid) {
              var record = store.getById(guid);
              if (record) {
                data.push(record.data);
              } else {
                Paperpile.log("No record found for folder GUID " + guid);
              }
            }
          });
          return data;
        }
      });
  }
});