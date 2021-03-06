// ContFis: Fis ContDelivery counterpart

// TODO: Read staging dir from argv, and get fis config json, create fis instance, run release to output dir

var fis = require('fis');
var path = require('path');
var argv = require('minimist')(process.argv.slice(2));
var projectRoot = path.resolve(argv.root)

//require('fis-postpackager-authorinfo').setProject(projectRoot)
//fis.cli.name = 'hello';
//fis.cli.info = fis.util.readJSON(__dirname + '/package.json');

var config = {
	modules: {
		parser: {
			shtml: 'ssi',
			sass: 'nodesass',
			scss: 'nodesass',
			coffee: 'coffee-script',
			//md: 'marked'
		},
		spriter: 'csssprites',
		postpackager: ['simple', 'authorinfo'],
		optimizer: {
			js: argv.minjs ? 'uglify-js' : '',
			css: argv.mincss ? 'clean-css': '',
			png: argv.png ? 'png-compressor': ''
		}
	},
	roadmap: {
		domain: {
			/*'image': ['http://img8.91huo.cn/hua/activity/exchange'],
			'**': '/activity/hua'*/
		},
		ext: {
			sass: 'css',
			scss: 'css',
			shtml: 'html',
			coffee: 'js',
			//md: 'html'
		},
		path: [
			{
				// https://github.com/fex-team/fis-spriter-csssprites
				reg: '**',
				useSprite: true,
				useStandard: false
			}
		]
	},
	//项目排除掉_xxx.scss，这些属于框架文件，不用关心
	// 同上，去掉_xxx.shtml
	project: {
		exclude: ['**/_*.scss', '**/_*.shtml']
		// TODO: exclude node_modules/*
	},
	settings: {
		postpackager: {
			// https://github.com/hefangshi/fis-postpackager-simple
			simple: {
				//开始autoCombine可以将零散资源进行自动打包
				autoCombine: false,
				//开启autoReflow使得在关闭autoCombine的情况下，依然会优化脚本与样式资源引用位置
				autoReflow: false,
				output: "packed/auto_combine_${hash}"
			}
		},
		spriter: {
			// https://github.com/fex-team/fis-spriter-csssprites
			csssprites: {
				margin: 20,
				//layout: 'matrix'
			}
		},
		optimizer: {
			'png-compressor' : {
                type : 'pngquant' //default is pngcrush
            }
		},
		parser: {
			sass: {
				// 加入文件查找目录
    			include_paths: []
			}
		}
	},
	pack: {
		// TODO: pass custom pack
	}
}

if(argv.gbk) {
	config.project.charset = 'gbk'
}

if(argv.redir || argv.absolute) { 
	config.roadmap.path = [
		{
			// https://github.com/fex-team/fis-spriter-csssprites
			// /(.*\.(?:css|scss))/i
			reg: '**',
			useSprite: true
		}
	]
	if(!argv.absolute) {
		config.modules.postpackager.push('relative')
	}
} else {
	// 是否绝对化路径？ 如果否，那就不能重定位和内嵌，和依赖分析
	
}

if(argv.combine) {
	config.settings.postpackager.simple.autoCombine = true
} 

if(argv.reflow) {
	config.settings.postpackager.simple.autoReflow = true
}

// 开启release --pack
var fisArgv = [
	'node',
	'fis',
	'release',
	'--root', projectRoot,
	'--dest', path.resolve(argv.dest),
	'--pack',
	'--optimize',
	'--unique',
	'--domains'
]

if(argv.fisfile) {
	fisArgv.push('--file')
	fisArgv.push(argv.fisfile)
}

if(argv.md5) {
	fisArgv.push('--md5')
	if(argv.packpath) {
		config.roadmap.path.unshift({
			// TODO: 用webpack的自定义文件名hash功能而不是query，用query如果部署在cdn下会产生资源覆盖问题
			// 同名文件被覆盖后，旧页面访问，样式、功能错误，或者没被覆盖，新页面访问也会如此
			reg: '/' + argv.packpath + '/**',
			useHash: false,
			query: '?t=' + (new Date()).valueOf()
		})
	}
}


fis.config.merge(config)


var wwwroot = path.resolve(argv.root)
var customFisConfig = path.resolve(wwwroot, '../DEV-INF', 'fisCustom.json')
try {
	var customConfig = require(customFisConfig)
	fis.config.merge(customConfig)
} catch (e) {
	
}


fis.cli.run(fisArgv)

