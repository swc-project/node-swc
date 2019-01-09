
const native = require('../native');
const compiler = new native.Compiler();

module.exports = {
    Compiler: native.Compiler,

    transformSync: function transformSync() {
        return compiler.transformSync.apply(compiler, arguments);
    },

    transformFileSync: function transformFileSync() {
        return compiler.transformFileSync.apply(compiler, arguments);
    }
}
