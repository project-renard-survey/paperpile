Ext.app.SearchField = Ext.extend(Ext.form.TwinTriggerField, {
  initComponent: function() {
    Ext.app.SearchField.superclass.initComponent.call(this);
    this.on('specialkey', function(f, e) {
      if (e.getKey() == e.ENTER) {
        this.onTrigger2Click();
      }
    },
    this);
  },

  validationEvent: false,
  validateOnBlur: false,
  trigger1Class: 'x-form-clear-trigger',
  trigger2Class: 'x-form-search-trigger',
  hideTrigger1: true,
  width: 180,
  hasSearch: false,
  paramName: 'plugin_query',

  afterRender: function() {
    Ext.app.SearchField.superclass.afterRender.call(this);

    // SwallowEvent code lifted from Editor.js -- causes
    // this field to swallow key events which would otherwise
    // be carried on to the grid (i.e. ctrl-A to select all)
    this.getEl().swallowEvent([
      'keypress', // *** Opera
      'keydown' // *** all other browsers
      ]);

  },

  onTrigger1Click: function() {
    if (this.hasSearch) {
      this.el.dom.value = '';
      this.triggers[0].hide();
      this.hasSearch = false;
    }
  },

  onTrigger2Click: function() {
    var v = this.getRawValue();
    if (v.length < 1) {
      this.onTrigger1Click();
      return;
    }
    var o = {
      start: 0,
      task: 'NEW'
    };
    this.store.baseParams = this.store.baseParams || {};
    this.store.baseParams['plugin_query'] = v;
    this.store.reload({
      params: o
    });
    this.hasSearch = true;
    this.triggers[0].show();
  }
});