var fs = require('fs')
var path = require('path')
var Datastore = require('nedb')
var extend = require('extend')
var Base = require('./Base')
var util = require('util')
var ssiMiddleware = require('./middleware/ssi')
var sassMiddleware = require('./middleware/sass')
var webpackMiddleware = require('./middleware/webpack')
var express = require('express')
var Watcher = require('./Watcher')
var webpack = require('webpack')
var webpackConfigGen = require('./webpackConfigGen')
var serveIndex = require('serve-index')
// var livepool...
//var ProjectModel = require('./ProjectModel')

module.exports = Project

function Project(projectPath) {
	// use project model to store mock data definition, etc
	this.path = projectPath
	this.workingDirName = 'wwwroot'
	this.infDirName = 'DEV-INF'
	this.db = new Datastore({ filename: path.join(projectPath, this.infDirName, 'project.db'), autoload: true })
	this.watcher = new Watcher(this)
	this.updateMiddleware()
	//this.initVDomains()	
}

var projectCache = {}

Project.get = function(path) {
	if(projectCache[path]) {
		return projectCache[path]
	} else {
		var project = new Project(path)
		projectCache[path] = project
		return project
	}
}

util.inherits(Project, Base)

extend(Project.prototype, {
	/*getMocks: function(callback) {
		// TODO: save to this.mocks or init this.mocks
		this.db.findOne({type: 'mock'}, callback)
	},
	saveMock: function(mockData, callback) {
		this.db.update({type: 'mock'}, mockData, {upsert: true}, callback)
		this.updateMiddleware()
	},*/
	getProjConfig: function(callback) {
		var self = this
		this.db.findOne({type: 'config'}, function(err, doc) {
			if(!doc) {
				// INITIAL CONFIG
				self.projectConfig = {
					type: 'config',
					webpack: {
					},
					fispack: {}
				}
			} else {
				self.projectConfig = doc
			}
			self.projectConfig.projectPath = self.path
			self.projectConfig.wwwPath = path.join(self.path, self.workingDirName)
			//self.saveProjConfig()
			callback(self.projectConfig)
		})
	},
	saveProjConfig: function(callback) {
		if(!callback) {
			callback = function(){}
		}
		this.saveData({type: 'config'}, this.projectConfig, callback)
		this.saveFisConfig()
	},
	saveFisConfig: function() {
		// 为了与fis打包系统通信，目前用保存json文件的方式
		var fisConfig = {}
		// custom pack
		fisConfig.pack = this.getConfig('fispack.pack')

		// domain
		fisConfig.roadmap = {}
		fisConfig.roadmap.domain = {}

		

		var customDomains = this.getConfig('fispack.domain.customs')
		if(customDomains) {
			extend(fisConfig.roadmap.domain, customDomains)
		}

		var imageDomains = this.getConfig('fispack.domain.images')
		if(imageDomains && imageDomains.length) {
			fisConfig.roadmap.domain.image = imageDomains
		}

		var globalDomain = this.getConfig('fispack.domain.global')
		if(globalDomain) {
			fisConfig.roadmap.domain['**'] = globalDomain
		}
		fs.writeFileSync(path.join(this.path, this.infDirName, 'fisCustom.json'), JSON.stringify(fisConfig))		

	},
	setConfig: function(path, value) {
		if(typeof value === 'undefined'){
			this.projectConfig = path;
		} else {
			path = String(path || '').trim()
			if(path) {
				var paths = path.split('.'),
					last = paths.pop(),
					data = this.projectConfig
				paths.forEach(function(key) {
					var type = typeof data[key]
					if(type === 'object') {
						data = data[key]
					} else if(type === 'undefined') {
						data = data[key] = {}
					} else {
						throw 'Forbit to set property [' + key + '] of ['  + type + '] data'
					}
				})
				data[last] = value
			}
		}
	},
	getConfig: function(path, def) {
		var result = this.projectConfig || {};
        (path || '').split('.').forEach(function(key){
            if(key && (typeof result !== 'undefined')){
                result = result[key];
            }
        });
        if(typeof result === 'undefined'){
            return def;
        } else {
            return result;
        }
	},
	updateWpConfig: function(wpconf) {
		this.projectConfig.webpack = wpconf
		this.saveProjConfig()
	},
	installWebpack: function(router) {
		var self = this
		this.getProjConfig(function(config) {
			var wpserver = webpackMiddleware(config.webpack, self)
			self._activeWPMiddleware = wpserver.middleware
			self._activeCompiler = wpserver.compiler
			self.watcher.bindCompiler(self._activeCompiler)
			router.use(wpserver.app)
		})
		
	},
	compileWebpack: function(callback) {
		var self = this
		
		var rimraf = require('rimraf')
		this.getProjConfig(function(config) {
			// delete pack dir first
			rimraf(path.join(self.path, self.workingDirName, config.packDirName || 'packed'), function() {
				// define PRODUCTION flag to generate production config
				webpack.PRODUCTION = true
				var wpconf = webpackConfigGen(config.webpack, self)
				// after config gen
				delete webpack.PRODUCTION
				webpack(wpconf, callback)
			})
		})
	},
	loadProjectRoute: function(router) {
		var self = this,
			loadingFile = ''
		try {
			fs.readdirSync(path.join(this.path, this.infDirName, 'routes')).forEach(function(file) {
				if(file.substr(file.lastIndexOf('.') + 1) !== 'js') {
					return
				}
				loadingFile = file
				var routeConfigPath = require.resolve(path.join(self.path, self.infDirName, 'routes', file))
				delete require.cache[routeConfigPath]
				require(routeConfigPath)(router)
			})
		} catch (e) {
			console.log('Loading Project Router failed: ' + loadingFile)
			console.log(e)
		}
	},
	saveData: function(query, data, callback) {
		this.db.update(query, data, {upsert: true}, callback)
	},
	initVDomains: function() {
		var self = this
		this.db.findOne({type: 'vdomain'}, function(err, doc) {
			if(!doc) {
				self.vdomains = []
				self.saveData({type: 'vdomain'}, {vdomains: self.vdomains})
			} else {
				self.vdomains = doc.vdomains
			}
		})
	},
	updateMiddleware: function() {
		if(this.middleware) {
			// close existing webpack watchers
			this._activeWPMiddleware.close()
		}
		var router = this.middleware = express.Router()

		this.getProjConfig(function() {
			this.loadVirtualAsRootDecider(router)
			this.loadProjectRoute(router)
			this.loadVirtualDirs(router)
			router.use(ssiMiddleware(path.join(this.path, this.workingDirName)).middleware)
			router.use(sassMiddleware(path.join(this.path, this.workingDirName)).middleware)
			this.installWebpack(router)
		}.bind(this))
		
		//TODO: this.installMock(router)
		//TODO: this.installPool(router)
	},
	loadVirtualDirs: function(router) {
		var dirDef = this.getConfig('dirs')
		var self = this
		if(dirDef && dirDef.length) {
			this.virtualDirMiddlwares = {}
			dirDef.forEach(function(def) {
				var middleware = express.Router()
				middleware.use(express.static(def.dir), serveIndex(def.dir, {'icons': true}))
				self.virtualDirMiddlwares[def.name] = middleware
				router.use('/' + def.name, middleware)
			})
		}
		
	},
	loadVirtualAsRootDecider: function(router) {
		var self = this
		router.use(function(req, res, next) {
			var middleware
			if(self.virtualRoot && (middleware = self.virtualDirMiddlwares[self.virtualRoot])) {
				middleware(req, res, next)
			} else {
				next()
			}
		})
	},
	getMiddleware: function() {
		// middleware might change, so we need to call it on every request
		return this.middleware
	},
	initWatcher: function() {
		// TODO: unified file watcher
		// 新建watcher， 跑一次compile获取filedependency，或者直接监控webroot， 一有变化根据变化的文件来判断是需要怎么通知？

	},
	initDir: function() {
		// TODO: use grunt-init task to create new proj dir
	},
	close: function() {
		this._activeWPMiddleware.close()
		this.watcher.close()
		delete projectCache[this.path]
	}
})


Project.isValid = function(projectPath) {
	return fs.existsSync(projectPath) && fs.existsSync(path.join(projectPath, 'wwwroot'))
}