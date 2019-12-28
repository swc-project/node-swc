const swc = require("../..");
const path = require("path");

it("should handle targets in env", () => {
  const filename = path.resolve(
    __dirname + "/../../tests/env/targets/input.js"
  );
  expect(swc.transformFileSync(filename).code.trim()).toContain(
    `const a of foo`
  );
});
