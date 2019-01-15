const SOURCE = `
'use strict';

class Greeter {
  greeting: string;
  constructor(message: string) {
      this.greeting = message;
  }
  greet() {
      return "Hello, " + this.greeting;
  }
}

let greeter = new Greeter("world");

let button = document.createElement('button');
button.textContent = "Say Hello";
button.onclick = function() {
  alert(greeter.greet());
}

document.body.appendChild(button);
`;



const PARSERS = [
  ['swc', '../', (module) => module.transformSync(SOURCE, {
    jsc: {
      parser: {
        syntax: "typescript",
      },
    }
  })],
  ['swc-optimize', '../', (module) => module.transformSync(SOURCE, {
    jsc: {
      parser: {
        syntax: "typescript",
      },
      transform: {
        optimizer: {}
      }
    }
  })],
  ['babel', '@babel/core', (module) => module.transformSync(SOURCE, {
    presets: ["@babel/preset-typescript", "@babel/preset-env"],
    // This does less work than swc's InlineGlobals pass, but it's ok.
    // swc is faster than babel anyway.
    plugins: [
      "transform-node-env-inline",
      "@babel/proposal-class-properties",
      "@babel/proposal-object-rest-spread"
    ],
    filename: 'foo.ts',
  })],
];

suite('typescript', () => {
  PARSERS.map((args) => {
    const [name, requirePath, fn] = args;
    try {
      const func = fn.bind(null, require(requirePath));
      bench(name, func);
    } catch (e) {
      console.log(`Cannot load ${requirePath}: ${e.message}`);
    }
  });
});
