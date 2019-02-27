const swc = require('../../lib/index'),
    validate = require('sourcemap-validator'),
    sourceMap = require('source-map');

it('should handle sourcemap correctly', async () => {
    const raw = `class Foo extends Array {}`;
    const out = await swc.transform(raw, {
        filename: 'input.js',
        sourceMaps: true
    });


    expect(out.map).toBeTruthy();
    validate(out.code, out.map, { 'input.js': raw });


    const mapped = await sourceMap.SourceMapConsumer.with(JSON.parse(out.map), null, (consumer) => {
        consumer.eachMapping((mappingItem) => {
            console.log(mappingItem)
        })

        // for (let i = 1; i < out.code.split('\n').length; i++) {
        //     console.log(consumer.originalPositionFor({
        //         source: 'input.js',
        //         line: i,
        //         column: 0
        //     }));
        // }
    });
})

it('should handle input sourcemap correctly', () => {

})