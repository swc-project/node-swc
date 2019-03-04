
const native = require('../native');

const version = require('../package.json').version;

class Compiler extends native.Compiler {
    parse(src, options) {
        options = options || {};
        options.syntax = options.syntax || 'ecmascript';

        return new Promise((resolve, reject) => {
            super.parse(src, options, (err, value) => {
                if (!!err) return reject(err);
                resolve(value)
            })
        });
    }

    parseSync(src, options) {
        options = options || {};
        options.syntax = options.syntax || 'ecmascript';
        return super.parseSync(src, options)
    }


    parseFile(src, options) {
        options = options || {};
        options.syntax = options.syntax || 'ecmascript';

        return new Promise((resolve, reject) => {
            super.parseFile(src, options, (err, value) => {
                if (!!err) return reject(err);
                resolve(value)
            })
        });
    }

    parseFileSync(src, options) {
        options = options || {};
        options.syntax = options.syntax || 'ecmascript';
        return super.parseFileSync(src, options)
    }

    print(m, options) {
        options = options || {};

        return new Promise((resolve, reject) => {
            super.print(m, options, (err, value) => {
                if (!!err) return reject(err);
                resolve(value)
            })
        });
    }

    printSync(m, options) {
        options = options || {};

        return super.printSync(m, options)
    }

    async transform(src, options) {
        options = options || {};
        const hasPlugins = loadPlugins(options);
        const plugins = options.plugins;
        delete options.plugins;
        options.emitAst = hasPlugins;
        options.emitCode = !hasPlugins;

        const out = await new Promise((resolve, reject) => {
            super.transform(src, options, (err, value) => {
                if (!!err)
                    return reject(err);
                resolve(value);
            });
        });
        if (hasPlugins) {
            const ast = applyPlugins(plugins, out.ast);
            return await this.print(ast, options);
        }
        return out;
    }

    transformSync(src, options) {
        options = options || {};
        const hasPlugins = loadPlugins(options);
        const plugins = options.plugins;
        delete options.plugins;
        options.emitAst = hasPlugins;
        options.emitCode = !hasPlugins;
        const out = super.transformSync(src, options)
        if (hasPlugins) {
            const ast = applyPlugins(plugins, out.ast);
            return this.printSync(ast, options);
        }
        return out;
    }

    async transformFile(path, options) {
        options = options || {};
        const hasPlugins = loadPlugins(options);
        const plugins = options.plugins;
        delete options.plugins;
        options.emitAst = hasPlugins;
        options.emitCode = !hasPlugins;

        const out = await new Promise((resolve, reject) => {
            super.transformFile(path, options, (err, value) => {
                if (!!err)
                    return reject(err);
                resolve(value);
            });
        });
        if (hasPlugins) {
            const ast = applyPlugins(plugins, out.ast);
            return await this.print(ast, options);
        }
        return out;
    }

    transformFileSync(path, options) {
        options = options || {};
        const hasPlugins = loadPlugins(options);
        const plugins = options.plugins;
        delete options.plugins;
        options.emitAst = hasPlugins;
        options.emitCode = !hasPlugins;

        const out = super.transformFileSync(path, options)
        if (hasPlugins) {
            const ast = applyPlugins(plugins, out.ast);
            return this.printSync(ast, options);
        }
        return out;
    }
}

/**
 * @returns true if options contain plugin
 */
function loadPlugins(options) {
    if (!options.hasOwnProperty('plugins')) {
        return false;
    }

    if (!Array.isArray(options.plugins)) {
        throw new TypeError('options.plugin must be array of function / string')
    }

    for (let i = 0; i < options.plugins.length; i++) {
        let plugin = options.plugins[i];
        if (typeof plugin === 'string') {
            plugin = require(plugin)
        } else if (typeof plugin === 'function') {
        } else {
            throw new TypeError('options.plugin must be array of function / string')
        }
        options.plugins[i] = plugin;
    }

    return true;
}

function applyPlugins(plugins, ast) {
    for (const plugin of plugins) {
        ast = plugin(ast);
    }
    return ast;
}

const compiler = new Compiler();

module.exports = {
    Compiler,
    version,

    parse: function parse() {
        return compiler.parse.apply(compiler, arguments)
    },

    parseSync: function parseSync() {
        return compiler.parseSync.apply(compiler, arguments)
    },

    parseFile: function parseFile() {
        return compiler.parseFile.apply(compiler, arguments)
    },

    parseFileSync: function parseFile() {
        return compiler.parseFileSync.apply(compiler, arguments)
    },

    print: function print() {
        return compiler.print.apply(compiler, arguments)
    },

    printSync: function printSync() {
        return compiler.printSync.apply(compiler, arguments)
    },

    transform: function transform() {
        return compiler.transform.apply(compiler, arguments);
    },

    transformSync: function transformSync() {
        return compiler.transformSync.apply(compiler, arguments);
    },

    transformFile: function transformFile() {
        return compiler.transformFile.apply(compiler, arguments);
    },

    transformFileSync: function transformFileSync() {
        return compiler.transformFileSync.apply(compiler, arguments);
    },

    DEFAULT_EXTENSIONS: Object.freeze([
        ".js",
        ".jsx",
        ".es6",
        ".es",
        ".mjs",
        ".ts",
        ".tsx",
    ])
}
