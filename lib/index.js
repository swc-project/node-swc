
const native = require('../native');
const compiler = new native.Compiler();
const version = require('../package.json');

module.exports = {
    Compiler: native.Compiler,
    version,

    transformSync: function transformSync() {
        return compiler.transformSync.apply(compiler, arguments);
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
    ])
}
