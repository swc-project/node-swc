const swc = require("../../lib/index");

it("should handle comments in return", () => {
  const out = swc.transformSync(`
  () => {
    return (
      // Interfering comment
      foo.bar
    );
  };
  `);

  expect(out.code).toContain(`return( // Interfering`);
});
