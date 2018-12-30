
declare module "swc" {
    /**
     * Options for trasnform.
     */
    export interface TransformOption {
        readonly syntax?: Syntax;
        /**
         * Effective only if `syntax` supports jsx.
         */
        readonly react?: ReactOptions,
        /**
         * Defaults to false.
         */
        readonly optimize?: boolean;

        readonly globals?: GlobalPassOption;
    }

    export enum Syntax {
        Es2019 = 'Es2019',
        Jsx = 'Jsx',
        // Typescript = 'Typescript',
        // Tsx = 'Tsx',
    }

    export interface ReactOptions {
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

    export function transform(src: string, options?: TransformOption): Output;
    export function transformFileSync(path: string, options?: TransformOption): Output;
}