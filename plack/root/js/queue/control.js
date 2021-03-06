/* Copyright 2009-2011 Paperpile

   This file is part of Paperpile

   Paperpile is free software: you can redistribute it and/or modify it
   under the terms of the GNU Affero General Public License as
   published by the Free Software Foundation, either version 3 of the
   License, or (at your option) any later version.

   Paperpile is distributed in the hope that it will be useful, but
   WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
   Affero General Public License for more details.  You should have
   received a copy of the GNU Affero General Public License along with
   Paperpile.  If not, see http://www.gnu.org/licenses. */


Paperpile.QueueControl = Ext.extend(Ext.Panel, {

  markup: [
    '<div class="pp-box pp-box-style1" style="height:200px;"',
    '<h2>Progress</h2>',
    '<p id="queue-progress"></p>',
    '<div id="queue-status"></div>',
    '<table style="border: 2px; margin: 10px auto;"><tr>',
    '<td style="padding: 0 10px;"><div id="pause-button"></div></td>',
    '<td style="padding: 0 10px;"><div id="cancel-button"></div></td>',
    '</tr></table>',
    '</div>', ],

  markupProgress: [
    '<p></p>',
    '<tpl if="eta"><p>About {eta} left.</p></tpl>', ],

  markupDone: [
    '<p>All tasks completed</p>', ],

  paused: false,

  initComponent: function() {
    Ext.apply(this, {
      cancelProcess: 0,
      bodyStyle: {
        background: '#ffffff',
        padding: '7px'
      },
      autoScroll: true,
    });

    Paperpile.QueueControl.superclass.initComponent.call(this);
  },

  // setIconClass does not seem to work in Ext JS 2, so we need a workaround
  // I hope it is fixed in Ext3
  setTabTitle: function(title, iconCls, closable) {

    var tabPanel = this.ownerCt.ownerCt.ownerCt;
    var tab = this.ownerCt.ownerCt;

    var el = tabPanel.getTabEl(tab);

    if (closable) {
      Ext.fly(el).addClass('x-tab-strip-closable');
    }

    var item = Ext.fly(el).child('.x-tab-strip-text');

    tab.setTitle(title);

    item.removeClass('pp-icon-queue');
    item.removeClass('pp-icon-pause');
    item.removeClass('pp-icon-tick');

    item.addClass(iconCls);

  },

  updateView: function() {

    if (!Ext.get('queue-status')) {
      this.initControls();
    }

    var currTpl;
    var tplProgress = new Ext.XTemplate(this.markupProgress);
    var tplDone = new Ext.XTemplate(this.markupDone);

    var r = this.ownerCt.ownerCt.items.get('grid').getStore().getAt(0);

    d = {};

    if (r) {

      this.status = r.data.queue_status;

      var num_done = parseInt(r.data.num_done);
      var num_pending = parseInt(r.data.num_pending);
      var num_all = num_done + num_pending;
      var eta = r.data.eta;

      if (this.status != 'DONE') {
        this.pause_button.show();
        this.cancel_button.show();
      }

      if (num_done < num_all) {

        d = {
          num_done: num_done,
          num_all: num_all,
          eta: eta,
        };
        currTpl = tplProgress;

        if (this.status === 'PAUSED') {
          this.setTabTitle('Background tasks (paused)', 'pp-icon-pause');
        } else {
          this.pbar.updateProgress(num_done / num_all, num_done + ' of ' + num_all + ' tasks completed');
          this.setTabTitle('Background tasks (' + num_done + '/' + num_all + ')', 'pp-icon-queue');
        }

      } else {
        currTpl = tplDone;
        this.setTabTitle('Background tasks', 'pp-icon-tick', true);
        this.pbar.updateProgress(1, 'Done');
        this.pause_button.hide();
        this.cancel_button.hide();
      }
    } else {
      currTpl = tplDone;
      this.setTabTitle('Background tasks', 'pp-icon-tick', true);
    }

    currTpl.overwrite(Ext.get('queue-status'), d);

  },

  initControls: function(data) {

    this.grid = this.ownerCt.ownerCt.items.get('grid');

    var bodyTpl = new Ext.XTemplate(this.markup);
    bodyTpl.overwrite(this.body, {});
    this.pbar = new Ext.ProgressBar({
      cls: 'pp-basic'
    });
    this.pbar.render('queue-progress', 0);

    var text = 'Pause';
    var cls = 'pause';

    var r = this.grid.getStore().getAt(0);

    if (r.data.queue_status === 'PAUSED') {
      text = 'Resume';
      cls = 'resume';
    }

    this.pause_button = new Ext.Button({
      text: text,
      cls: 'x-btn-text-icon ' + cls,
      handler: function(button) {
        var r = this.grid.getStore().getAt(0);

        if (r) {
          var el = this.pause_button.getEl();

          if (r.data.queue_status === 'RUNNING') {
            Paperpile.Ajax({
              url: '/ajax/queue/pause',
              success: function(response) {
                this.grid.store.reload();
                this.pause_button.setText('Resume');
                el.replaceClass('pause', 'resume');

              },
              scope: this
            });
          }

          if (r.data.queue_status === 'PAUSED') {
            Paperpile.Ajax({
              url: '/ajax/queue/resume',
              success: function(response) {
                this.grid.store.reload();
                this.pause_button.setText('Pause queue');
                el.replaceClass('resume', 'pause');
              },
              scope: this
            });
          }
        }

      },
      scope: this
    });

    this.pause_button.render('pause-button', 0);

    this.cancel_button = new Ext.Button({
      text: 'Cancel all tasks',
      cls: 'x-btn-text-icon cancel',
      handler: function(button) {

      },
      scope: this,
    });

    this.cancel_button.render('cancel-button', 0);

  },

});
