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

Paperpile.Dashboard = Ext.extend(Ext.Panel, {

  title: 'Dashboard',
  iconCls: 'pp-icon-dashboard',

  initComponent: function() {
    Ext.apply(this, {
      closable: true,
      autoScroll: true,
      autoLoad: {
        url: Paperpile.Url('/screens/dashboard'),
        callback: this.setupFields,
        scope: this
      },

    });

    Paperpile.PatternSettings.superclass.initComponent.call(this);

  },

  setupFields: function() {

    var el = Ext.get('dashboard-last-imported');

    Ext.DomHelper.overwrite(el, Paperpile.utils.prettyDate(el.dom.innerHTML));

    this.body.on('click', function(e, el, o) {

      switch (el.getAttribute('action')) {

      case 'statistics':
        Paperpile.main.tabs.newScreenTab('Statistics');
        break;
      case 'settings-patterns':
        Paperpile.main.tabs.newScreenTab('PatternSettings');
        break;
      case 'settings-general':
        Paperpile.main.tabs.newScreenTab('GeneralSettings');
        break;
      case 'settings-tex':
        Paperpile.main.tabs.newScreenTab('TexSettings');
        break;
      case 'duplicates':
        Paperpile.main.tabs.newPluginTab('Duplicates', {},
          "Duplicates", "pp-icon-folder", "duplicates")
        break;
      case 'catalyst':
        Paperpile.main.tabs.newScreenTab('CatalystLog', 'catalyst-log');
        break;
      case 'updates':
        Paperpile.main.checkForUpdates(false);
        break;
      }
    },
    this, {
      delegate: 'a'
    });

    var settings = Paperpile.main.globalSettings['bibtex'];

    var field = new Ext.form.Checkbox({
      checked: settings.bibtex_mode === '1' ? true : false,
      id: 'bibtex-checkbox',
      renderTo: 'bibtex-mode-checkbox',
    });

    Ext.get('bibtex-checkbox').parent().setStyle({display:'inline'});
    Ext.get('bibtex-checkbox').setStyle({'vertical-align':'middle'});


    if (settings.bibtex_mode === '1'){
      Ext.get('bibtex-mode-text-active').show();
      Ext.get('bibtex-mode-text-inactive').hide();
    } else {
      Ext.get('bibtex-mode-text-active').hide();
      Ext.get('bibtex-mode-text-inactive').show();
    }

    
    field.on('check',
      function(box, checked) {
        var currentSettings = Paperpile.main.getSetting('bibtex');

        var value = (checked) ? "1" : "0";

        currentSettings['bibtex_mode'] = value;

        Paperpile.main.setSetting('bibtex', currentSettings);

        Paperpile.status.updateMsg({
          msg: (checked) ? 'Activated BibTeX mode' : 'De-activated BibTeX mode',
          duration: 2
        });

        if (checked){
          //Ext.get('bibtex-mode-settings').show();
          Ext.get('bibtex-mode-text-active').show();
          Ext.get('bibtex-mode-text-inactive').hide();
        } else {
          //Ext.get('bibtex-mode-settings').hide();
          Ext.get('bibtex-mode-text-inactive').show();
          Ext.get('bibtex-mode-text-active').hide();
        }

        
      },
      this);

  },

});