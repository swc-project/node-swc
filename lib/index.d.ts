
declare module "swc" {

    export class Compiler {
        constructor();

        transformSync(src: string, options?: Config): Output;
        transformFileSync(path: string, options?: Config): Output;
    }

    export interface Config {
        readonly jsc?: JscConfig;
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
         * Defaults to false.
         */
        readonly tsx?: boolean;
        /**
         * Defaults to false.
         */
        readonly decorators?: boolean;
    }

    export interface EsParserConfig {
        readonly syntax: "ecmascript";
        /**
         * Defaults to false.
         */
        readonly jsc?: boolean;
        readonly numericSeparator?: boolean;
        readonly classPrivateProperty?: boolean;
        readonly privateMethod?: boolean;
        readonly classProperty?: boolean;
        readonly functionBind?: boolean;
        readonly decorators?: boolean;
        readonly decoratorsBeforeExport?: boolean;
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
        readonly pragma_frag: String,
        /**
         * Toggles whether or not to throw an error if a XML namespaced tag name is used. For example:
         * `<f:image />`
         * 
         * Though the JSX spec allows this, it is disabled by default since React's
         * JSX does not currently have support for it.
         * 
         */
        readonly throw_if_namespace: boolean,
        /**
         * Toggles plugins that aid in development, such as @babel/plugin-transform-react-jsx-self 
         * and @babel/plugin-transform-react-jsx-source.
         * 
         * Defaults to `false`,
         * 
         */
        readonly development: boolean,
        /**
         * Use `Object.assign()` instead of `_extends`. Defaults to false.
         */
        readonly use_builtins: boolean,

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
         * e.g. { __DEBUG__: true }
         */
        readonly vars?: { [key: string]: string };
    }

    export interface Output {
        /**
         * Transformed code
         */
        readonly code: string;
        /**
         * Sourcemap (not base64 encoded)
         */
        readonly map: string;
    }

    export function transformSync(src: string, options?: Config): Output;
    export function transformFileSync(path: string, options?: Config): Output;

    export const DEFAULT_EXTENSIONS = Object.freeze([
        ".js",
        ".jsx",
        ".es6",
        ".es",
        ".mjs",
    ]);
}