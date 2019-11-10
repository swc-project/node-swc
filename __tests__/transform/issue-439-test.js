const swc = require("../../lib/index");

it("should handle comments in return", () => {
  const out = swc.transformSync(`() => {
      return (
        Promise.resolve('foo')
          // Interfering
          .then(() => {})
      );
    };`);
  expect(out.code).toContain(`return(//Interfering`);
});
