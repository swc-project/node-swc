
const swc = require('../lib/index');

it('should work', async () => {
    await swc.transform('class Foo {}', { filename: 'foo.js' });
})