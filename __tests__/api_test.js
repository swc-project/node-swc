
const swc = require('../lib/index');

it('should handle minify', () => {
    const src = '/* Comment */import foo, {bar} from "foo"';

    expect(swc.transformSync(src, {
        minify: true,
    }).code.trim()).toBe("import foo,{bar}from'foo';");
});