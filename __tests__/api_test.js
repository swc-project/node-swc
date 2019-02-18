
const swc = require('../lib/index');

it('should handle minify', () => {
    const src = '/* Comment */import foo, {bar} from "foo"';

    expect(swc.transformSync(src, {
        minify: true,
    }).code.trim()).toBe("import foo,{bar}from'foo';");
});

it('should handle exportNamespaceFrom', () => {
    const src = "export * as Foo from 'bar';";
    const out = swc.transformSync(src, {
        jsc: {
            parser: {
                syntax: "ecmascript",
                exportNamespaceFrom: true,
            }
        }
    });

    expect(out.code).toContain("import * as _Foo from 'bar';");
    expect(out.code).toContain("export { _Foo as Foo }");
});