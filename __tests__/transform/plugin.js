const swc = require("../../lib/");
const Visitor = require("../../lib/Visitor").default;

it("works", () => {
  const src = `/* Comment */import foo, {bar} from "foo"
 class Foo extends Parent {} `;

  swc.transformSync(src, {
    minify: true,
    plugin: m => m
  });
});

it("works with visitor", () => {
  const src = `/* Comment */import foo, {bar} from "foo"
 class Foo extends Parent {} `;

  swc.transformSync(src, {
    minify: true,
    plugin: m => new Visitor().visitModule(m)
  });
});
