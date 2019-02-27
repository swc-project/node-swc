
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

    transform(src, options) {
        options = options || {};

        return new Promise((resolve, reject) => {
            super.transform(src, options, (err, value) => {
                if (!!err) return reject(err);
                resolve(value)
            })
        });
    }

    transformFile(path, options) {
        options = options || {};

        return new Promise((resolve, reject) => {
            super.transformFile(path, options, (err, value) => {
                if (!!err) return reject(err);
                resolve(value)
            })
        });
    }
}

const compiler = new Compiler();

module.exports = {
    Compiler,
    version,

    parse: function parse() {
        return compiler.parse.apply(compiler, arguments)
    },

    parseFile: function parseFile() {
        return compiler.parseFile.apply(compiler, arguments)
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
