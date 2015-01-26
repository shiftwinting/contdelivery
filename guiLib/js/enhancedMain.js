// Generated by CoffeeScript 1.7.1
var Button, LoadedProject;

Button = Remix.create({
  template: '<button type="button" class="btn"></button>',
  remixEvent: {
    'click': 'clickCallback'
  },
  render: function(data) {
    this.node.attr('class', "btn btn-" + data.type + " btn-" + data.size);
    this.node.text(data.title);
    return this.clickCallback = data.onclick;
  }
});

LoadedProject = Remix.create({
  remixChild: {
    Button: Button
  },
  template: "<div class=\"col-sm-6 col-md-4\">\n	<div class=\"panel panel-primary\">\n		<div class=\"panel-heading\">\n			<button remix=\"Button\" data-type=\"danger\" data-size=\"xs\" data-onclick=\"@unloadProject\" data-title=\"X\" key=\"unloadBtn\"></button> &nbsp;&nbsp;<span ref=\"pathtxt\"></span>\n		</div>\n		<div class=\"panel-body\">\n			<ul ref=\"urlList\">\n				\n			</ul>\n		  	\n		</div>\n		<div class=\"panel-footer\">\n			<p class=\"text-right\">\n		  		\n	  			<button remix=\"Button\" data-type=\"primary\" data-size=\"xs\" data-onclick=\"@configProject\" data-title=\"配置\" key=\"configBtn\"></button>\n	  			<button remix=\"Button\" data-type=\"info\" data-size=\"xs\" data-onclick=\"@openDirectory\" data-title=\"打开目录\" key=\"openDirBtn\"></button>\n	  			<button remix=\"Button\" data-type=\"danger\" data-size=\"xs\" data-onclick=\"@packProject\" data-title=\"打包\" key=\"packBtn\"></button>\n		  	</p>\n		</div>\n	</div>\n</div>",
  onNodeCreated: function() {
    return this.appendTo('#loaded-container');
  },
  render: function(data) {
    this.pathtxt.text(data.path);
    this.urlList.empty();
    data.urls.forEach((function(_this) {
      return function(url) {
        return _this.urlList.append("<li><a href=\"" + url + "\">" + url + "</a></li>");
      };
    })(this));
    return this.openDirectory = data.openDirectory, this.unloadProject = data.unloadProject, this.configProject = data.configProject, this.packProject = data.packProject, data;
  },
  openDirectory: function() {},
  unloadProject: function() {},
  configProject: function() {},
  packProject: function() {}
});
