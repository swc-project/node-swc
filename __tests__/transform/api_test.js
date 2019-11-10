const swc = require("../../lib/index");

it("should handle minify", () => {
  const src = '/* Comment */import foo, {bar} from "foo"';

  expect(
    swc
      .transformSync(src, {
        minify: true
      })
      .code.trim()
  ).toBe("import foo,{bar}from'foo';");
});

it("should handle sourceMaps = false", () => {
  const src = '/* Comment */import foo, {bar} from "foo"';
  const out = swc.transformSync(src, {
    sourceMaps: false
  });

  expect(out.map).toBeFalsy();
});

it("should handle exportNamespaceFrom", () => {
  const src = "export * as Foo from 'bar';";
  const out = swc.transformSync(src, {
    jsc: {
      parser: {
        syntax: "ecmascript",
        exportNamespaceFrom: true
      }
    }
  });

  expect(out.code).toContain("import * as _Foo from 'bar';");
  expect(out.code).toContain("export { _Foo as Foo }");
});

it("should handle exportNamespaceFrom configured by .swcrc", () => {
  const out = swc.transformFileSync(__dirname + "/../../issue-226/input.js");

  expect(out.code).toContain("import * as _Foo from 'bar';");
  expect(out.code).toContain("export { _Foo as Foo }");
});

it("should handle jsc.target = es3", () => {
  const out = swc.transformSync(`foo.default`, {
    jsc: {
      target: "es3"
    }
  });
  expect(out.code.trim()).toBe(`foo['default'];`);
});

it("should handle jsc.target = es5", () => {
  const out = swc.transformSync(`foo.default`, {
    jsc: {
      target: "es5"
    }
  });
  expect(out.code.trim()).toBe(`foo.default;`);
});

it("should handle react correctly", () => {
  const out = swc.transformFileSync(__dirname + "/../../issue-351/input.js");

  expect(out.code).toContain(`.default.createElement('div', null);`);
});

it("should handle cjs imports", () => {
  const out = swc.transformFileSync(__dirname + "/../../issue-389/input.js");

  expect(out.code).toContain(`.default.bar = true`);
});

it("should handle comments in arrow expression", () => {
  const out = swc.transformFileSync(__dirname + "/../../issue-406/input.js");

  expect(out.code).toContain(`return true`);
});

it("should handle comments in return statement", () => {
  const out = swc.transformFileSync(__dirname + "/../../issue-415/input.js");

  expect(out.code.replace(/ /g, "")).toContain(`return(/*#__PURE__*/`);
});

it("should handle multiple entries in swcrc", () => {
  const out1 = swc.transformFileSync(__dirname + "/../../issue-414/a.js");
  expect(out1.code).toContain(`require('foo')`);

  const out2 = swc.transformFileSync(__dirname + "/../../issue-414/b.ts");
  expect(out2.code).toContain(`define(['bar'], function(_bar) {`);
});

it("should handle comments in return", () => {
  const out = swc.transformSync(`() => {
    return (
      Promise.resolve('foo')
        // Interfering
        .then(() => {})
    );
  };`);
  expect(out.code.replace(/ /gi, "")).toContain(`return(//Interfering`);
});
