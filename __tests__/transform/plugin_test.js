
const swc = require('../../lib/index');

it('should handle plugin', () => {
    const out = swc.transformSync(`async function foo() {}`, {
        plugins: [
            // function (m) {
            //     console.log(m);
            //     return m;
            // },
        ]
    });
});