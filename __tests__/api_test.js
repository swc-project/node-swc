
const swc = require('../lib/index');


it('should handle modules config', () => {
    const out = swc.transformSync('import foo from "foo"', {
        module: {
            type: "commonjs"
        }
    });

    expect(out.code).toContain(`var _foo = _interopRequireDefault(require('foo'))`);
});



it('should handle minify', () => {
    const src = '/* Comment */import foo, {bar} from "foo"';

    expect(swc.transformSync(src, {
        minify: true,
    }).code.trim()).toBe("import foo,{bar}from'foo';");
});