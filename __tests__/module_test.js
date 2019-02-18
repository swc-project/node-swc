
const swc = require('../lib/index');


it('should handle modules config', () => {
    const out = swc.transformSync('import foo from "foo"', {
        module: {
            type: "commonjs"
        }
    });
    expect(out.map).toBeUndefined();

    expect(out.code).toContain(`function _interopRequireDefault`);
    expect(out.code).toContain(`var _foo = _interopRequireDefault(require('foo'))`);
});


it('should respect modules config in .swcrc', () => {
    const out = swc.transformFileSync(__dirname + '/../issue-225/input.js');

    expect(out.map).toBeUndefined();

    expect(out.code).toContain(`function _interopRequireDefault`);
    expect(out.code).toContain(`var _foo = _interopRequireDefault(require('foo'))`);
});
