
declare module "@swc/core" {

    export class Compiler {
        constructor();

        transform(src: string, options?: Options): Promise<Output>;
        transformSync(src: string, options?: Options): Output;
        transformFile(path: string, options?: Options): Promise<Output>;
        transformFileSync(path: string, options?: Options): Output;
    }

    /**
     * Programmatic options.
     */
    export interface Options extends Config {
        /**
         * The working directory that all paths in the programmatic 
         * options will be resolved relative to.
         * 
         * Defaults to `process.cwd()`.
         */
        readonly cwd?: string;
        readonly caller?: CallerOptions;
        /** The filename associated with the code currently being compiled,
         * if there is one. The filename is optional, but not all of Swc's
         * functionality is available when the filename is unknown, because a 
         * subset of options rely on the filename for their functionality.
         * 
         * The three primary cases users could run into are:
         * 
         * - The filename is exposed to plugins. Some plugins may require the
         * presence of the filename.
         * - Options like "test", "exclude", and "ignore" require the filename
         * for string/RegExp matching.
         * - .swcrc files are loaded relative to the file being compiled.
         * If this option is omitted, Swc will behave as if swcrc: false has been set.
         */
        readonly filename?: string;

        /**
         * The initial path that will be processed based on the "rootMode" to
         * determine the conceptual root folder for the current Swc project.
         * This is used in two primary cases:
         * 
         * - The base directory when checking for the default "configFile" value
         * - The default value for "swcrcRoots".
         * 
         * Defaults to `opts.cwd`
         */
        readonly root?: string;

        /**
         * This option, combined with the "root" value, defines how Swc chooses 
         * its project root. The different modes define different ways that Swc
         * can process the "root" value to get the final project root.
         * 
         * "root" - Passes the "root" value through as unchanged.
         * "upward" - Walks upward from the "root" directory, looking for a directory
         * containinga swc.config.js file, and throws an error if a swc.config.js
         * is not found.
         * "upward-optional" - Walk upward from the "root" directory, looking for
         * a directory containing a swc.config.js file, and falls back to "root"
         *  if a swc.config.js is not found.
         *
         * 
         * "root" is the default mode because it avoids the risk that Swc 
         * will accidentally load a swc.config.js that is entirely outside
         * of the current project folder. If you use "upward-optional",
         * be aware that it will walk up the directory structure all the
         * way to the filesystem root, and it is always possible that someone
         * will have a forgotten swc.config.js in their home directory,
         * which could cause unexpected errors in your builds.
         *
         * 
         * Users with monorepo project structures that run builds/tests on a
         * per-package basis may well want to use "upward" since monorepos
         * often have a swc.config.js in the project root. Running Swc
         * in a monorepo subdirectory without "upward", will cause Swc
         * to skip loading any swc.config.js files in the project root,
         * which can lead to unexpected errors and compilation failure.
         */
        readonly rootMode?: 'root' | 'upward' | 'upward-optional';

        /**
         * The current active environment used during configuration loading.
         * This value is used as the key when resolving "env" configs,
         * and is also available inside configuration functions, plugins,
         * and presets, via the api.env() function.
         * 
         * Defaults to `process.env.SWC_ENV || process.env.NODE_ENV || "development"`
         */
        readonly envName?: string;

        /**
         * Defaults to searching for a default swc.config.js file, but can
         * be passed the path of any JS or JSON5 config file.
         *
         * 
         * NOTE: This option does not affect loading of .swcrc files,
         * so while it may be tempting to do configFile: "./foo/.swcrc",
         * it is not recommended. If the given .swcrc is loaded via the
         * standard file-relative logic, you'll end up loading the same
         * config file twice, merging it with itself. If you are linking
         * a specific config file, it is recommended to stick with a
         * naming scheme that is independent of the "swcrc" name.
         * 
         * Defaults to `path.resolve(opts.root, "swc.config.js")`
         */
        readonly configFile?: string | boolean;

        /**
         * true will enable searching for configuration files relative to the "filename" provided to Swc.
         *
         * A swcrc value passed in the programmatic options will override one set within a configuration file.
         *
         * Note: .swcrc files are only loaded if the current "filename" is inside of
         *  a package that matches one of the "swcrcRoots" packages.
         * 
         *
         * Defaults to true as long as the filename option has been specificed
         */
        readonly swcrc?: boolean;

        /**
         * By default, Babel will only search for .babelrc files within the "root" package
         *  because otherwise Babel cannot know if a given .babelrc is meant to be loaded,
         *  or if it's "plugins" and "presets" have even been installed, since the file
         *  being compiled could be inside node_modules, or have been symlinked into the project.
         *
         * 
         * This option allows users to provide a list of other packages that should be
         * considered "root" packages when considering whether to load .babelrc files.
         *
         * 
         * For example, a monorepo setup that wishes to allow individual packages
         * to have their own configs might want to do
         *
         *
         * 
         * Defaults to `opts.root`
         */
        readonly swcrcRoots?: boolean | MatchPattern | MatchPattern[];

        /**
         * `true` will attempt to load an input sourcemap from the file itself, if it
         * contains a //# sourceMappingURL=... comment. If no map is found, or the
         * map fails to load and parse, it will be silently discarded.
         *
         *  If an object is provided, it will be treated as the source map object itself.
         * 
         * Defaults to `true`.
         */
        readonly inputSourceMap?: boolean | string;

        /**
         * - true to generate a sourcemap for the code and include it in the result object.
         * - "inline" to generate a sourcemap and append it as a data URL to the end of the code, but not include it in the result object.
         * - "both" is the same as inline, but will include the map in the result object.
         * 
         * `swc-cli` overloads some of these to also affect how maps are written to disk:
         *
         * - true will write the map to a .map file on disk
         * - "inline" will write the file directly, so it will have a data: containing the map
         * - "both" will write the file with a data: URL and also a .map.
         * - Note: These options are bit weird, so it may make the most sense to just use true
         *  and handle the rest in your own code, depending on your use case.
         */
        readonly sourceMaps?: boolean | "inline" | "both";

        /**
         * The name to use for the file inside the source map object.
         * 
         * Defaults to `path.basename(opts.filenameRelative)` when available, or `"unknown"`.
         */
        readonly sourceFileName?: string;

        /**
         * The sourceRoot fields to set in the generated source map, if one is desired.
         */
        readonly sourceRoot?: string;
    }

    export interface CallerOptions {
        readonly name: string,
        [key: string]: any
    }

    /**
     * .swcrc
     */
    export interface Config {
        readonly jsc?: JscConfig;
        readonly module?: ModuleConfig;
        readonly minify?: boolean;
    }

    export interface JscConfig {
        /**
         * Defaults to EsParserConfig
         */
        readonly parser?: ParserConfig;
        readonly transform?: TransformConfig;
    }

    export type ParserConfig = TsParserConfig | EsParserConfig;
    export interface TsParserConfig {
        readonly syntax: "typescript";
        /**
         * Defaults to `false`.
         */
        readonly tsx?: boolean;
        /**
         * Defaults to `false`.
         */
        readonly decorators?: boolean;
        /**
         * Defaults to `false`
         */
        readonly dynamicImport?: boolean;
    }

    export interface EsParserConfig {
        readonly syntax: "ecmascript";
        /**
         * Defaults to false.
         */
        readonly jsc?: boolean;
        /**
         * Defaults to `false`. This is not implemented yet.
         */
        readonly numericSeparator?: boolean;
        /**
         * Defaults to `false`
         */
        readonly classPrivateProperty?: boolean;
        /**
         * Defaults to `false`
         */
        readonly privateMethod?: boolean;
        /**
         * Defaults to `false`
         */
        readonly classProperty?: boolean;
        /**
         * Defaults to `false`
         */
        readonly functionBind?: boolean;
        /**
         * Defaults to `false`
         */
        readonly decorators?: boolean;
        /**
         * Defaults to `false`
         */
        readonly decoratorsBeforeExport?: boolean;
        /**
         * Defaults to `false`
         */
        readonly dynamicImport?: boolean;
    }

    /**
     * Options for trasnform.
     */
    export interface TransformConfig {
        /**
         * Effective only if `syntax` supports jsx.
         */
        readonly react?: ReactConfig,
        /**
         * Defaults to null, which skips optimizer pass.
         */
        readonly optimizer?: OptimizerConfig;
    }

    export interface ReactConfig {
        /**
         * Replace the function used when compiling JSX expressions.
         * 
         * Defaults to `React.createElement`.
         */
        readonly pragma: String,
        /**
         * Replace the component used when compiling JSX fragments.
         * 
         * Defaults to `React.Fragment`
         */
        readonly pragmaFrag: String,
        /**
         * Toggles whether or not to throw an error if a XML namespaced tag name is used. For example:
         * `<f:image />`
         * 
         * Though the JSX spec allows this, it is disabled by default since React's
         * JSX does not currently have support for it.
         * 
         */
        readonly throwIfNamespace: boolean,
        /**
         * Toggles plugins that aid in development, such as @swc/plugin-transform-react-jsx-self 
         * and @swc/plugin-transform-react-jsx-source.
         * 
         * Defaults to `false`,
         * 
         */
        readonly development: boolean,
        /**
         * Use `Object.assign()` instead of `_extends`. Defaults to false.
         */
        readonly useBuiltins: boolean,

    }

    export interface OptimizerConfig {
        readonly globals?: GlobalPassOption;
    }

    /**
     * Options for inline-global pass.
     */
    export interface GlobalPassOption {
        /**
         * Global variables.
         * 
         * e.g. `{ __DEBUG__: true }`
         */
        readonly vars?: { [key: string]: string };

        /**
         * Name of environment variables to inline.
         * 
         * Defaults to `["NODE_ENV", "SWC_ENV"]`
         */
        readonly envs?: string[];
    }

    export type ModuleConfig = CommonJsConfig | UmdConfig;

    export interface CommonJsConfig {
        readonly type: 'commonjs';

        /**
         * By default, when using exports with babel a non-enumerable `__esModule` 
         * property is exported. In some cases this property is used to determine
         * if the import is the default export or if it contains the default export.
         * 
         * In order to prevent the __esModule property from being exported, you
         *  can set the strict option to true.
         * 
         * Defaults to `false`.
         */
        readonly strict?: boolean;

        /**
         * Emits 'use strict' directive.
         * 
         * Defaults to `true`.
         */
        readonly strict_mode?: boolean;

        /**
         * Changes Babel's compiled import statements to be lazily evaluated when their imported bindings are used for the first time.
         *
         * This can improve initial load time of your module because evaluating dependencies up
         *  front is sometimes entirely un-necessary. This is especially the case when implementing
         *  a library module.
         * 
         * 
         * The value of `lazy` has a few possible effects:
         *
         *  - `false` - No lazy initialization of any imported module.
         *  - `true` - Do not lazy-initialize local `./foo` imports, but lazy-init `foo` dependencies.
         *
         * Local paths are much more likely to have circular dependencies, which may break if loaded lazily,
         * so they are not lazy by default, whereas dependencies between independent modules are rarely cyclical.
         *
         *  - `Array<string>` - Lazy-initialize all imports with source matching one of the given strings.
         *
         * -----
         * 
         * The two cases where imports can never be lazy are:
         *
         *  - `import "foo";`
         *
         * Side-effect imports are automatically non-lazy since their very existence means
         *  that there is no binding to later kick off initialization.
         *
         *  - `export * from "foo"`
         *
         * Re-exporting all names requires up-front execution because otherwise there is no
         * way to know what names need to be exported.
         * 
         * Defaults to `false`.
         */
        readonly lazy?: boolean | string[];
        /**
         * By default, when using exports with swc a non-enumerable __esModule property is exported.
         * This property is then used to determine if the import is the default export or if
         *  it contains the default export.
         * 
         * In cases where the auto-unwrapping of default is not needed, you can set the noInterop option
         *  to true to avoid the usage of the interopRequireDefault helper (shown in inline form above).
         * 
         * Defaults to `false`.
         */
        readonly noInterop?: boolean;
    }

    export interface UmdConfig {
        readonly type: 'umd';
        readonly globals?: { [key: string]: string };
    }

    export interface Output {
        /**
         * Transformed code
         */
        code: string;
        /**
         * Sourcemap (**not** base64 encoded)
         */
        map: string;
    }

    export function transform(src: string, options?: Options): Promise<Output>;
    export function transformSync(src: string, options?: Options): Output;
    export function transformFile(path: string, options?: Options): Promise<Output>;
    export function transformFileSync(path: string, options?: Options): Output;

    export const DEFAULT_EXTENSIONS: string[];

    export interface MatchPattern { }
}