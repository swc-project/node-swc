const swc = require('../../lib/index');

it('should work', async () => {
    const m = await swc.parse(`class Foo {}`);

    expect(m.type).toBe(`Module`);
    expect(m.body).toHaveLength(1);
    expect(m.body[0].type).toBe(`ClassDeclaration`);
})