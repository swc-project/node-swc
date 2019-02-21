const swc = require('../lib/index');

it('should perform dce', () => {
    const out = swc.transformSync(`if (__DEBUG__) {
        console.log('Foo')
    }`, {
            jsc: {
                transform: {
                    optimizer: {
                        globals: {
                            vars: {
                                __DEBUG__: 'true'
                            },
                        }
                    }
                }
            }
        }
    );
    expect(out.map).toBeUndefined();

    expect(out.code.trim()).toBe(`console.log('Foo');`);
});