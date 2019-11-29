
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

    transform(src, options) {
        options = options || {};
        const plugin = options.plugin;
        delete options.plugin;

        return new Promise((resolve, reject) => {
            super.transform(src, options, plugin, (err, value) => {
                if (!!err) return reject(err);
                resolve(value)
            })
        });
    }

    transformSync(src, options) {
        const plugin = options.plugin;
        delete options.plugin;

        return super.transformSync(src, options, plugin)
    }

    transformFile(path, options) {
        options = options || {};
        const plugin = options.plugin;
        delete options.plugin;

        return new Promise((resolve, reject) => {
            super.transformFile(path, options, plugin, (err, value) => {
                if (!!err) return reject(err);
                resolve(value)
            })
        });
    }

    transformFileSync(path, options) {
        const plugin = options.plugin;
        delete options.plugin;

        return super.transformFileSync(path, options, plugin)
    }
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
