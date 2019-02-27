const swc = require('../../lib/index');

it('should work asynchronously', async () => {
    const m = await swc.parse(`class Foo {}`);

    expect(m.type).toBe(`Module`);
    expect(m.body).toHaveLength(1);
    expect(m.body[0].type).toBe(`ClassDeclaration`);
})

it('can work synchronously', () => {
    const m = swc.parseSync(`class Foo {}`);

    expect(m.type).toBe(`Module`);
    expect(m.body).toHaveLength(1);
    expect(m.body[0].type).toBe(`ClassDeclaration`);
})

