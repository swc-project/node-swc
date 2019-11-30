import { Plugin, ParseOptions, Module, Output, Options } from "./types";
export * from "./types";
import { wrapNativeSuper } from "./util";

const native = require("../native");

/**
 * Version of the swc binding.
 */
export const version = require("../package.json").version;

export function plugins(ps: Plugin[]): Plugin {
  return mod => {
    let m = mod;
    for (const p of ps) {
      m = p(m);
    }
    return m;
  };
}

export class Compiler extends wrapNativeSuper(native.Compiler) {
  public constructor() {
    super();
  }

  parse(src: string, options?: ParseOptions): Promise<Module> {
    options = options || { syntax: "ecmascript" };
    options.syntax = options.syntax || "ecmascript";

    return new Promise((resolve, reject) => {
      super.parse(src, options, (err: any, value: string) => {
        if (!!err) return reject(err);
        resolve(JSON.parse(value));
      });
    });
  }

  parseSync(src: string, options?: ParseOptions): Module {
    options = options || { syntax: "ecmascript" };
    options.syntax = options.syntax || "ecmascript";
    return JSON.parse(super.parseSync(src, options));
  }

  parseFile(path: string, options?: ParseOptions): Promise<Module> {
    options = options || { syntax: "ecmascript" };
    options.syntax = options.syntax || "ecmascript";

    return new Promise((resolve, reject) => {
      super.parseFile(path, options, (err: any, value: string) => {
        if (!!err) return reject(err);
        resolve(JSON.parse(value));
      });
    });
  }

  parseFileSync(path: string, options?: ParseOptions): Module {
    options = options || { syntax: "ecmascript" };
    options.syntax = options.syntax || "ecmascript";
    return JSON.parse(super.parseFileSync(path, options));
  }

  /**
   * Note: this method should be invoked on the compiler instance used
   *  for `parse()` / `parseSync()`.
   */
  print(m: Module, options?: Options): Promise<Output> {
    options = options || {};

    return new Promise((resolve, reject) => {
      super.print(JSON.stringify(m), options, (err: any, value: Output) => {
        if (!!err) return reject(err);
        resolve(value);
      });
    });
  }

  /**
   * Note: this method should be invoked on the compiler instance used
   *  for `parse()` / `parseSync()`.
   */
  printSync(m: Module, options?: Options): Output {
    options = options || {};

    return super.printSync(JSON.stringify(m), options);
  }

  async transform(src: string | Module, options?: Options): Promise<Output> {
    const isModule = typeof src !== "string";
    options = options || {};
    options.jsc = options.jsc || {};
    const plugin = options.plugin;
    delete options.plugin;

    if (plugin) {
      const m =
        typeof src === "string"
          ? await this.parse(src, options.jsc.parser)
          : src;
      return this.transform(plugin(m), options);
    }

    return new Promise((resolve, reject) => {
      super.transform(
        isModule ? JSON.stringify(src) : src,
        isModule,
        options,
        (err: any, value: Output) => {
          if (!!err) return reject(err);
          resolve(value);
        }
      );
    });
  }

  transformSync(src: string | Module, options?: Options): Output {
    const isModule = typeof src !== "string";
    options = options || {};
    options.jsc = options.jsc || {};
    const plugin = options.plugin;
    delete options.plugin;

    if (plugin) {
      const m =
        typeof src === "string" ? this.parseSync(src, options.jsc.parser) : src;
      return this.transformSync(plugin(m), options);
    }

    return super.transformSync(
      isModule ? JSON.stringify(src) : src,
      isModule,
      options
    );
  }

  async transformFile(path: string, options?: Options): Promise<Output> {
    options = options || {};
    options.jsc = options.jsc || {};
    const plugin = options.plugin;
    delete options.plugin;

    if (plugin) {
      const m = await this.parseFile(path, options.jsc.parser);
      return this.transform(plugin(m), options);
    }

    return new Promise((resolve, reject) => {
      super.transformFile(
        path,
        /* isModule */ false,
        options,
        (err: any, value: Output) => {
          if (!!err) return reject(err);
          resolve(value);
        }
      );
    });
  }

  transformFileSync(path: string, options?: Options): Output {
    options = options || {};
    options.jsc = options.jsc || {};
    const plugin = options.plugin;
    delete options.plugin;

    if (plugin) {
      const m = this.parseFileSync(path, options.jsc.parser);
      return this.transformSync(plugin(m), options);
    }

    return super.transformFileSync(path, /* isModule */ false, options);
  }
}

const compiler = new Compiler();

export function parse(src: string, options?: ParseOptions): Promise<Module> {
  return compiler.parse(src, options);
}

export function parseSync(src: string, options?: ParseOptions): Module {
  return compiler.parseSync(src, options);
}

export function parseFile(
  path: string,
  options?: ParseOptions
): Promise<Module> {
  return compiler.parseFile(path, options);
}

export function parseFileSync(path: string, options?: ParseOptions): Module {
  return compiler.parseFileSync(path, options);
}

export function print(m: Module, options?: Options): Promise<Output> {
  return compiler.print(m, options);
}

export function printSync(m: Module, options?: Options): Output {
  return compiler.printSync(m, options);
}

export function transform(
  src: string | Module,
  options?: Options
): Promise<Output> {
  return compiler.transform(src, options);
}

export function transformSync(src: string | Module, options?: Options): Output {
  return compiler.transformSync(src, options);
}

export function transformFile(
  path: string,
  options?: Options
): Promise<Output> {
  return compiler.transformFile(path, options);
}

export function transformFileSync(path: string, options?: Options): Output {
  return compiler.transformFileSync(path, options);
}

export const DEFAULT_EXTENSIONS = Object.freeze([
  ".js",
  ".jsx",
  ".es6",
  ".es",
  ".mjs",
  ".ts",
  ".tsx"
]);
