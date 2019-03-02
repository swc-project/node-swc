
declare module "@swc/core" {

    export class Compiler {
        constructor();

        parse(src: string, options?: ParseOptions): Promise<Module>;
        parseSync(src: string, options?: ParseOptions): Module;
        parseFile(path: string, options?: ParseOptions): Promise<Module>;
        parseFileSync(path: string, options?: ParseOptions): Module;
        /**
         * Note: this method should be invoked on the compiler instance used
         *  for `parse()` / `parseSync()`.
         */
        print(m: Module, options?: Options): Promise<Output>;
        /**
         * Note: this method should be invoked on the compiler instance used
         *  for `parse()` / `parseSync()`.
         */
        prinSynct(m: Module, options?: Options): Output;

        transform(src: string, options?: Options): Promise<Output>;
        transformSync(src: string, options?: Options): Output;
        transformFile(path: string, options?: Options): Promise<Output>;
        transformFileSync(path: string, options?: Options): Output;
    }

    export function parse(src: string, options?: ParseOptions): Promise<Module>;
    export function parseSync(src: string, options?: ParseOptions): Module;
    export function parseFile(path: string, options?: ParseOptions): Promise<Module>;
    export function parseFileSync(path: string, options?: ParseOptions): Module;

    export function print(m: Module, options?: Options): Promise<Output>;
    export function prinSynct(m: Module, options?: Options): Output;

    export function transform(src: string, options?: Options): Promise<Output>;
    export function transformSync(src: string, options?: Options): Output;
    export function transformFile(path: string, options?: Options): Promise<Output>;
    export function transformFileSync(path: string, options?: Options): Output;

    export type ParseOptions = ParserConfig & {
        readonly comments?: boolean;
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
         * Defaults to searching for a default `.swcrc` file, but can
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
         * Defaults to `path.resolve(opts.root, ".swcrc")`
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
        /**
         * Use `@swc/helpers` instead of inline helpers.
         */
        readonly externalHelpers?: boolean;

        /**
         * Defaults to `es3` (which enableds **all** pass).
         */
        readonly target?: JscTarget;
    }

    export type JscTarget = 'es3'
        | 'es5'
        | 'es2015'
        | 'es2016'
        | 'es2017'
        | 'es2018'
        | 'es2019';

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
         * Effective only if `syntax` supports ƒ.
         */
        readonly react?: ReactConfig,

        readonly constModules?: ConstModulesConfig;

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
    /**
     *  - `import { DEBUG } from '@ember/env-flags';`
     *  - `import { FEATURE_A, FEATURE_B } from '@ember/features';`
     * 
     * See: https://github.com/swc-project/swc/issues/18#issuecomment-466272558
     */
    export interface ConstModulesConfig {
        readonly globals?: {
            readonly [module: string]: {
                readonly [name: string]: string
            }
        };
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

    export type ModuleConfig = CommonJsConfig | UmdConfig | AmdConfig;


    export interface BaseModuleConfig {
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

    export interface CommonJsConfig extends BaseModuleConfig {
        readonly type: 'commonjs';
    }

    export interface UmdConfig extends BaseModuleConfig {
        readonly type: 'umd';
        readonly globals?: { [key: string]: string };
    }

    export interface AmdConfig extends BaseModuleConfig {
        readonly type: 'amd';
        readonly moduleId: string;
    }

    export interface Output {
        /**
         * Transformed code
         */
        code: string;
        /**
         * Sourcemap (**not** base64 encoded)
         */
        map?: string;
    }



    export const DEFAULT_EXTENSIONS: string[];

    /**
     * Version of the swc binding.
     */
    export const version: string;

    export interface MatchPattern { }




    // -------------------------------
    // ---------- Ast nodes ----------
    // -------------------------------

    export interface Span {
        start: number;
        end: number;
        ctxt: number;
    }

    export interface Node {
        readonly type: string;
    }

    export interface HasSpan {
        span?: Span;
    }

    export interface HasDecorator {
        decorators?: Decorator[];
    }

    export interface Class extends HasSpan, HasDecorator {
        body?: ClassMember[];

        superClass?: Expression,

        is_abstract?: boolean,

        typeParams?: TsTypeParameterDeclaration,

        superTypeParams?: TsTypeParameterInstantiation,

        implements?: TsExpressionWithTypeArguments[],
    }

    export type ClassMember = Constructor
        | ClassMethod
        | PrivateMethod
        | ClassProperty
        | PrivateProperty
        | TsIndexSignature;


    export interface ClassPropertyBase extends Node, HasSpan, HasDecorator {
        value?: Expression;

        typeAnnotation?: TsTypeAnnotation;

        is_static?: boolean;

        computed?: boolean;

        accessibility?: Accessibility;

        /// Typescript extension.
        is_abstract?: boolean;

        is_optional?: boolean;

        readonly?: boolean;

        definite?: boolean,
    }

    export interface ClassProperty extends ClassPropertyBase {
        readonly type: 'ClassProperty';

        key: Expression,
    }

    export interface PrivateProperty extends ClassPropertyBase {
        readonly type: 'PrivateProperty';

        key: PrivateName,
    }

    export interface Constructor extends Node, HasSpan {
        readonly type: 'Constructor';

        key: PropertyName;

        params: (Pattern | TsParameterProperty)[];

        body?: BlockStatement;

        accessibility?: Accessibility;

        is_optional?: boolean;
    }

    export interface ClassMethodBase extends Node, HasSpan {
        function: Fn;

        kind: MethodKind;

        is_static?: boolean;

        accessibility?: Accessibility;

        is_abstract?: boolean;

        is_optional?: boolean;
    }

    export interface ClassMethod extends ClassMethodBase {
        readonly type: 'ClassMethod';

        key: PropertyName;
    }

    export interface PrivateMethod extends ClassMethodBase {
        readonly type: 'PrivateMethod';

        key: PrivateName;
    }

    export interface Decorator extends Node, HasSpan {
        readonly type: 'Decorator';

        expression: Expression;
    }

    export type MethodKind = 'method' | 'setter' | 'getter';

    export type Declaration = ClassDeclaration
        | FunctionDeclaration
        | VariableDeclaration
        | TsInterfaceDeclaration
        | TsTypeAliasDeclaration
        | TsEnumDeclaration
        | TsModuleDeclaration;

    export interface FunctionDeclaration extends Fn {
        readonly type: 'FunctionDeclaration';

        ident: Identifier,

        declare?: boolean;
    }

    export interface ClassDeclaration extends Class, Node {
        readonly type: 'ClassDeclaration';

        identifier: Identifier;

        declare?: boolean;
    }

    export interface VariableDeclaration extends Node, HasSpan {
        readonly type: 'VariableDeclaration';

        kind: VariableDeclarationKind;

        declare?: boolean;

        declarations: VariableDeclarator[],
    }

    export type VariableDeclarationKind = 'get' | 'let' | 'const';

    export interface VariableDeclarator extends Node, HasSpan {
        readonly type: 'VariableDeclarator';

        id: Pattern;

        /// Initialization expresion.
        init?: Expression;

        /// Typescript only
        definite?: boolean;
    }

    export type Expression = ThisExpression
        | ArrayExpression
        | ObjectExpression
        | FunctionExpression
        | UnaryExpression
        | UpdateExpression
        | BinaryExpression
        | AssignmentExpression
        | MemberExpression
        | ConditionalExpression
        | CallExpression
        | NewExpression
        | SequenceExpression
        | Identifier
        | Literal
        | TemplateLiteral
        | TaggedTemplateExpression
        | ArrowFunctionExpression
        | ClassExpression
        | YieldExpression
        | MetaProperty
        | AwaitExpression
        | ParenthesisExpression
        | JSXMemberExpression
        | JSXNamespacedName
        | JSXEmptyExpression
        | JSXElement
        | JSXFragment
        | TsTypeAssertion
        | TsNonNullExpression
        | TsTypeCastExpression
        | TsAsExpression
        | PrivateName;

    interface ExpressionBase extends Node, HasSpan { }

    export interface ThisExpression extends ExpressionBase {
        readonly type: 'ThisExpression';
    }

    export interface ArrayExpression extends ExpressionBase {
        readonly type: 'ArrayExpression';

        elements?: (Expression | SpreadElement | undefined)[]
    }

    export interface ObjectExpression extends ExpressionBase {
        readonly type: 'ObjectExpression';

        properties?: (Property | SpreadElement)[]
    }

    export type PropertOrSpread = Property | SpreadElement;

    export interface SpreadElement extends Node {
        readonly type: 'SpreadElement';

        spread: Span;

        arguments: Expression;
    }

    export interface UnaryExpression extends ExpressionBase {
        readonly type: 'UnaryExpression';

        operator: UnaryOperator;

        argument: Expression;
    }

    export interface UpdateExpression extends ExpressionBase {
        readonly type: 'UpdateExpression';

        operator: UpdateOperator;

        prefix: boolean;

        argument: Expression;
    }

    export interface BinaryExpression extends ExpressionBase {
        readonly type: 'BinaryExpression';

        operator: BinaryOperator;

        left: Expression;

        right: Expression;
    }

    export interface FunctionExpression extends Fn, ExpressionBase {
        readonly type: 'FunctionExpression';

        identifier?: Identifier;
    }

    export interface ClassExpression extends Class, ExpressionBase {
        readonly type: 'ClassExpression';

        identifier?: Identifier;
    }

    export interface AssignmentExpression extends ExpressionBase {
        readonly type: 'AssignmentExpression';

        operator: AssignmentOperator;

        left: Pattern | Expression;

        right: Expression;
    }

    export interface MemberExpression extends ExpressionBase {
        readonly type: 'MemberExpression';

        object: Expression | Super;

        property: Expression;

        computed: boolean;
    }

    export interface ConditionalExpression extends ExpressionBase {
        readonly type: 'ConditionalExpression';

        test: Expression;

        consequent: Expression;

        alternate: Expression;
    }

    export type Super = Span;

    export interface CallExpression extends ExpressionBase {
        readonly type: 'CallExpression';

        callee: Expression | Super,

        arguments?: (Expression | SpreadElement)[],

        typeArguments?: TsTypeParameterInstantiation,
    }

    export interface NewExpression extends ExpressionBase {
        readonly type: 'NewExpression';

        callee: Expression

        arguments?: (Expression | SpreadElement)[];

        typeArguments?: TsTypeParameterInstantiation;
    }

    export interface SequenceExpression extends ExpressionBase {
        readonly type: 'SequenceExpression';

        expressions: Expression[];
    }

    export interface ArrowFunctionExpression extends ExpressionBase {
        readonly type: 'ArrowFunctionExpression';

        params: Pattern[];

        body: (BlockStatement | Expression);

        async?: boolean;

        generator?: boolean;

        typeParameters?: TsTypeParameterDeclaration;

        returnType?: TsTypeAnnotation;

    }

    export interface YieldExpression extends ExpressionBase {
        readonly type: 'YieldExpression';

        argument?: Expression,

        delegate?: boolean;
    }

    export interface MetaProperty extends Node {
        readonly type: 'MetaProperty';

        meta: Identifier;

        property: Identifier;
    }

    export interface AwaitExpression extends ExpressionBase {
        readonly type: 'AwaitExpression';

        argument: Expression;
    }

    export interface TplBase {
        expressions: Expression[];

        quasis: TemplateElement[];
    }

    export interface TemplateLiteral extends ExpressionBase, TplBase {
        readonly type: 'TemplateLiteral';
    }

    export interface TaggedTemplateExpression extends ExpressionBase, TplBase {
        readonly type: 'TaggedTemplateExpression';

        tag: Expression;

        typeParameters?: TsTypeParameterInstantiation;
    }

    export interface TemplateElement extends ExpressionBase {
        readonly type: 'TemplateElement';

        tail: boolean;
        cooked?: StringLiteral,
        raw: StringLiteral,
    }

    export interface ParenthesisExpression extends ExpressionBase {
        readonly type: 'ParenthesisExpression';

        expression: Expression
    }

    export interface Fn extends HasSpan, HasDecorator {
        params: Pattern[],

        body?: BlockStatement,

        generator?: boolean;

        async?: boolean;

        typeParameters?: TsTypeParameterDeclaration,

        returnType?: TsTypeAnnotation,
    }

    interface PatternBase {
        typeAnnotation?: TsTypeAnnotation;
    }

    export interface Identifier extends HasSpan, PatternBase {
        readonly type: 'Identifier';

        value: string;

        /// TypeScript only. Used in case of an optional parameter.
        optional?: boolean;
    }

    export interface PrivateName extends ExpressionBase {
        readonly type: 'PrivateName';

        id: Identifier,
    }

    export type JSXObject = JSXMemberExpression | Identifier;

    export interface JSXMemberExpression extends Node {
        readonly type: 'JSXMemberExpression';

        object: JSXObject,
        property: Identifier,
    }

    /**
     * XML-based namespace syntax:
     */
    export interface JSXNamespacedName extends Node {
        readonly type: 'JSXNamespacedName';

        namespace: Identifier;
        name: Identifier;
    }

    export interface JSXEmptyExpression extends Node, HasSpan {
        readonly type: 'JSXEmptyExpression';
    }

    export interface JSXExpressionContainer extends Node {
        readonly type: 'JSXExpressionContainer';

        expression: JSXExpression;
    }

    export type JSXExpression = JSXEmptyExpression | Expression;

    export interface JSXSpreadChild extends Node {
        readonly type: 'JSXSpreadChild';

        expression: Expression;
    }

    export type JSXElementName = Identifier | JSXMemberExpression | JSXNamespacedName;

    export interface JSXOpeningElement extends Node, HasSpan {
        readonly type: 'JSXOpeningElement';

        name: JSXElementName;

        attrs?: JSXAttributeOrSpread[];

        selfClosing: boolean;

        typeArguments?: TsTypeParameterInstantiation;
    }

    export type JSXAttributeOrSpread = JSXAttribute | SpreadElement;

    export interface JSXClosingElement extends Node, HasSpan {
        readonly type: 'JSXClosingElement';

        name: JSXElementName;
    }

    export interface JSXAttribute extends Node, HasSpan {
        readonly type: 'JSXAttribute';

        name: JSXAttributeName,

        value?: Expression,
    }

    export type JSXAttributeName = Identifier | JSXNamespacedName;

    export type JSXAttrValue = Literal | JSXExpressionContainer | JSXElement | JSXFragment;

    export interface JSXText extends Node, HasSpan {
        readonly type: 'JSXText';

        value: string;
        raw: string;
    }

    export interface JSXElement extends Node, HasSpan {
        readonly type: 'JSXElement';

        opening: JSXOpeningElement;
        children: JSXElementChild[];
        closing?: JSXClosingElement;
    }

    export type JSXElementChild = JSXText | JSXExpressionContainer | JSXSpreadChild | JSXElement | JSXFragment;

    export interface JSXFragment extends Node, HasSpan {
        readonly type: 'JSXFragment';

        opening: JSXOpeningFragment;

        children?: JSXElementChild[],

        closing: JSXClosingFragment;
    }

    export interface JSXOpeningFragment extends Node, HasSpan {
        readonly type: 'JSXOpeningFragment';
    }

    export interface JSXClosingFragment extends Node, HasSpan {
        readonly type: 'JSXClosingFragment';
    }

    export type Literal = StringLiteral
        | BooleanLiteral
        | NullLiteral
        | NumericLiteral
        | RegExpLiteral
        | JSXText;

    export interface StringLiteral extends Node, HasSpan {
        readonly type: 'StringLiteral';

        value: string;
        has_escape?: boolean;
    }

    export interface BooleanLiteral extends Node, HasSpan {
        readonly type: 'BooleanLiteral';

        value: boolean;
    }

    export interface NullLiteral extends Node, HasSpan {
        readonly type: 'NullLiteral';
    }

    export interface RegExpLiteral extends Node, HasSpan {
        readonly type: 'RegExpLiteral';

        pattern: StringLiteral;
        flags?: RegexFlags;
    }

    export type RegexFlags = StringLiteral;

    export interface NumericLiteral extends Node, HasSpan {
        readonly type: 'NumericLiteral';

        value: number
    }

    export type ModuleDeclaration = ImportDeclaration
        | ExportDeclaration
        | ExportNamedDeclaration
        | ExportDefaultDeclaration
        | ExportDefaultExpression
        | ExportAllDeclaration
        | TsImportEqualsDeclaration
        | TsExportAssignment
        | TsNamespaceExportDeclaration;

    export interface ExportDefaultExpression extends Node, HasSpan {
        readonly type: 'ExportDefaultExpression';

        expression: Expression;
    }

    export interface ExportDeclaration extends Node, HasSpan {
        readonly type: 'ExportDeclaration';

        declaration: Declaration;
    }

    export interface ImportDeclaration extends Node, HasSpan {
        readonly type: 'ImportDeclaration';

        specifiers?: ImporSpecifier[];

        source: StringLiteral;
    }

    export type ImporSpecifier = ImportDefaultSpecifier
        | NamedImportSpecifier
        | ImportNamespaceSpecifier;

    export interface ExportAllDeclaration extends Node, HasSpan {
        readonly type: 'ExportAllDeclaration';

        source: StringLiteral;
    }


    /**
     * - `export { foo } from 'mod'`
     * - `export { foo as bar } from 'mod'`
     */
    export interface ExportNamedDeclaration extends Node, HasSpan {
        readonly type: 'ExportNamedDeclaration';

        specifiers: ExportSpecifier[];

        source?: StringLiteral;
    }

    export interface ExportDefaultDeclaration extends Node, HasSpan {
        readonly type: 'ExportDefaultDeclaration';

        decl: DefaultDecl;
    }

    export type DefaultDecl = ClassExpression | FunctionExpression | TsInterfaceDeclaration;

    export type ImportSpecifier = NamedImportSpecifier
        | ImportDefaultSpecifier
        | ImportNamespaceSpecifier;

    /**
     * e.g. `import foo from 'mod.js'`
     */
    export interface ImportDefaultSpecifier extends Node, HasSpan {
        readonly type: 'ImportDefaultSpecifier';
        local: Identifier;
    }

    /**
     * e.g. `import * as foo from 'mod.js'`.
     */
    export interface ImportNamespaceSpecifier extends Node, HasSpan {
        readonly type: 'ImportNamespaceSpecifier';

        local: Identifier;
    }

    /**
     * e.g. - `import { foo } from 'mod.js'`
     * 
     * local = foo, imported = None 
     * 
     * e.g. `import { foo as bar } from 'mod.js'`
     * 
     * local = bar, imported = Some(foo) for 
     */
    export interface NamedImportSpecifier extends Node, HasSpan {
        readonly type: 'ImportSpecifier';
        local: Identifier;
        imported?: Identifier;
    }

    export type ExportSpecifier = ExportNamespaceSpecifer | ExportDefaultSpecifier | NamedExportSpecifier;

    /**
     * `export * as foo from 'src';`
     */
    export interface ExportNamespaceSpecifer extends Node, HasSpan {
        readonly type: 'ExportNamespaceSpecifer';

        name: Identifier;
    }

    export interface ExportDefaultSpecifier extends Node, HasSpan {
        readonly type: 'ExportDefaultSpecifier';

        exported: Identifier;
    }

    export interface NamedExportSpecifier extends Node, HasSpan {
        readonly type: 'ExportSpecifier';

        orig: Identifier;
        /**
         * `Some(bar)` in `export { foo as bar }`
         */
        exported?: Identifier;
    }

    interface HasInterpreter {
        /**
         * e.g. `/usr/bin/node` for `#!/usr/bin/node`
         */
        interpreter?: string;
    }

    export interface Module extends Node, HasSpan, HasInterpreter {
        readonly type: 'Module';

        body: ModuleItem[]
    }

    export interface Script extends Node, HasSpan, HasInterpreter {
        readonly type: 'Script';

        body: Statement[]
    }

    export type ModuleItem = ModuleDeclaration | Statement;

    export type BinaryOperator = '==' | '!=' | '===' | '!=='
        | '<' | '<=' | '>' | '>='
        | '<<' | '>>' | '>>>'
        | '+' | '-' | '*' | '/' | '%' | '**'
        | '|' | '^' | '&'
        | '||' | '&&'
        | 'in'
        | 'instanceof';

    export type AssignmentOperator = '='
        | '+=' | '-=' | '*=' | '/=' | '%=' | '**='
        | '<<=' | '>>=' | '>>>='
        | '|=' | '^=' | '&=';

    export type UpdateOperator = '++' | '--';

    export type UnaryOperator = '-' | '+' | '!' | '~' | 'typeof' | 'void' | 'delete';

    export type Pattern = Identifier
        | ArrayPattern
        | RestElement
        | ObjectPattern
        | AssignmentPattern
        | Expression;


    export interface ArrayPattern extends Node, HasSpan, PatternBase {
        readonly type: 'ArrayPattern';

        elements: (Pattern | undefined)[];
    }

    export interface ObjectPattern extends Node, HasSpan, PatternBase {
        readonly type: 'ObjectPattern';

        props: ObjectPatternProperty[];
    }

    export interface AssignmentPattern extends Node, HasSpan, PatternBase {
        readonly type: 'AssignmentPattern';

        left: Pattern;
        right: Expression;
    }

    export interface RestElement extends Node, HasSpan, PatternBase {
        readonly type: 'RestElement';

        rest: Span;

        argument: Pattern
    }

    export type ObjectPatternProperty = KeyValuePatternProperty
        | AssignmentPatternProperty
        | RestElement;

    /**
     * `{key: value}`
     */
    export interface KeyValuePatternProperty extends Node {
        readonly type: 'KeyValuePatternProperty';

        key: PropertyName,
        value: Pattern;
    }

    /**
     * `{key}` or `{key = value}`
     */
    export interface AssignmentPatternProperty extends Node, HasSpan {
        readonly type: 'AssignmentPatternProperty';

        key: Identifier;
        value?: Expression;
    }

    /** Identifier is `a` in `{ a, }` */
    export type Property = Identifier
        | KeyValueProperty
        | AssignmentProperty
        | GetterProperty
        | SetterProperty
        | MethodProperty;

    interface PropBase extends Node {

        key: PropertyName;
    }

    export interface KeyValueProperty extends PropBase {
        readonly type: 'KeyValueProperty';

        value: Expression;
    }

    export interface AssignmentProperty extends Node {
        readonly type: 'AssignmentProperty';

        key: Identifier;
        value: Expression;
    }

    export interface GetterProperty extends PropBase, HasSpan {
        readonly type: 'GetterProperty';

        body?: BlockStatement;
    }

    export interface SetterProperty extends PropBase, HasSpan {
        readonly type: 'SetterProperty';

        param: Pattern;
        body?: BlockStatement;
    }

    export interface MethodProperty extends PropBase, Fn {
        readonly type: 'MethodProperty';

    }

    export type PropertyName = Identifier
        | StringLiteral
        | NumericLiteral
        | Expression;


    export interface BlockStatement extends Node, HasSpan {
        readonly type: 'BlockStatement';

        stmts: Statement[];
    }

    export type Statement = Expression
        | BlockStatement
        | EmptyStatement
        | DebuggerStatement
        | WithStatement
        | ReturnStatement
        | LabeledStatement
        | BreakStatement
        | ContinueStatement
        | IfStatement
        | SwitchStatement
        | ThrowStatement
        | TryStatement
        | WhileStatement
        | DoWhileStatement
        | ForStatement
        | ForInStatement
        | ForOfStatement
        | Declaration;

    export interface EmptyStatement extends Node, HasSpan {
        readonly type: 'EmptyStatement';
    }

    export interface DebuggerStatement extends Node, HasSpan {
        readonly type: 'DebuggerStatement';
    }

    export interface WithStatement extends Node, HasSpan {
        readonly type: 'WithStatement';

        object: Expression;
        body: Statement;
    }

    export interface ReturnStatement extends Node, HasSpan {
        readonly type: 'ReturnStatement';

        argument?: Expression;
    }

    export interface LabeledStatement extends Node, HasSpan {
        readonly type: 'LabeledStatement';

        label: Identifier;
        body: Statement;
    }

    export interface BreakStatement extends Node, HasSpan {
        readonly type: 'BreakStatement';

        label?: Identifier;
    }

    export interface ContinueStatement extends Node, HasSpan {
        readonly type: 'ContinueStatement';

        label?: Identifier;
    }

    export interface IfStatement extends Node, HasSpan {
        readonly type: 'IfStatement';

        test: Expression;
        consequent: Statement;
        alternate?: Statement;
    }

    export interface SwitchStatement extends Node, HasSpan {
        readonly type: 'SwitchStatement';

        discriminant: Expression;
        cases: SwitchCase[];
    }

    export interface ThrowStatement extends Node, HasSpan {
        readonly type: 'ThrowStatement';

        argument: Expression;
    }

    export interface TryStatement extends Node, HasSpan {
        readonly type: 'TryStatement';

        block: BlockStatement;
        handler?: CatchClause;
        finalizer?: BlockStatement;
    }

    export interface WhileStatement extends Node, HasSpan {
        readonly type: 'WhileStatement';

        test: Expression;
        body: Statement;
    }

    export interface DoWhileStatement extends Node, HasSpan {
        readonly type: 'DoWhileStatement';

        test: Expression;
        body: Statement;
    }

    export interface ForStatement extends Node, HasSpan {
        readonly type: 'ForStatement';

        init?: VariableDeclaration | Expression;
        test?: Expression;
        update?: Expression;
        body: Statement;
    }

    export interface ForInStatement extends Node, HasSpan {
        readonly type: 'ForInStatement';

        left: VariableDeclaration | Pattern;
        right: Expression;
        body: Statement;
    }

    export interface ForOfStatement extends Node, HasSpan {
        readonly type: 'ForOfStatement';

        /**
         *  Span of the await token.
         * 
         *  es2018 for-await-of statements, e.g., `for await (const x of xs) {`
         */
        await?: Span;
        left: VariableDeclaration | Pattern;
        right: Expression;
        body: Statement;
    }

    export interface SwitchCase extends Node, HasSpan {
        readonly type: 'SwitchCase';

        /**
         * Undefined for default case
         */
        test?: Expression;
        consequent: Statement[];
    }

    export interface CatchClause extends Node, HasSpan {
        readonly type: 'CatchClause';

        /**
         * The param is `undefined` if the catch binding is omitted. E.g., `try { foo() } catch {}`
         */
        param?: Pattern;
        body: BlockStatement;
    }

    export interface TsTypeAnnotation extends Node, HasSpan {
        readonly type: 'TsTypeAnnotation';

        typeAnnotation: TsType;
    }

    export interface TsTypeParameterDeclaration extends Node, HasSpan {
        readonly type: 'TsTypeParameterDeclaration';

        parameters: TsTypeParameter[];
    }

    export interface TsTypeParameter extends Node, HasSpan {
        readonly type: 'TsTypeParameter';

        name: Identifier;
        constraint?: TsType;
        default?: TsType;
    }

    export interface TsTypeParameterInstantiation extends Node, HasSpan {
        readonly type: 'TsTypeParameterInstantiation';

        params: TsType[]
    }

    export interface TsTypeCastExpression extends Node, HasSpan {
        readonly type: 'TsTypeCastExpression';

        expression: Expression;
        typeAnnotation: TsTypeAnnotation;
    }

    export interface TsParameterProperty extends Node, HasSpan, HasDecorator {
        readonly type: 'TsParameterProperty';

        accessibility?: Accessibility;
        readonly: boolean;
        param: TsParameterPropertyParameter;
    }

    export type TsParameterPropertyParameter = Identifier
        | AssignmentPattern;

    export interface TsQualifiedName extends Node {
        readonly type: 'TsQualifiedName';

        left: TsEntityName;
        right: Identifier;
    }

    export type TsEntityName = TsQualifiedName | Identifier;

    export type TsSignatureDeclaration = TsCallSignatureDeclaration
        | TsConstructSignatureDeclaration
        | TsMethodSignature
        | TsFunctionType
        | TsConstructorType;

    export type TsTypeElement = TsCallSignatureDeclaration
        | TsConstructSignatureDeclaration
        | TsPropertySignature
        | TsMethodSignature
        | TsIndexSignature;

    export interface TsCallSignatureDeclaration extends Node, HasSpan {
        readonly type: 'TsCallSignatureDeclaration';

        params: TsFnParameter[];
        typeAnnotation?: TsTypeAnnotation;
        typeParams?: TsTypeParameterDeclaration;
    }

    export interface TsConstructSignatureDeclaration extends Node, HasSpan {
        readonly type: 'TsConstructSignatureDeclaration';

        params: TsFnParameter[];
        typeAnnotation?: TsTypeAnnotation;
        typeParams?: TsTypeParameterDeclaration;
    }

    export interface TsPropertySignature extends Node, HasSpan {
        readonly type: 'TsPropertySignature';

        readonly: boolean;
        key: Expression;
        computed: boolean;
        optional: boolean;

        init?: Expression;
        params: TsFnParameter[];

        typeAnnotation?: TsTypeAnnotation;
        typeParams?: TsTypeParameterDeclaration;
    }

    export interface TsMethodSignature extends Node, HasSpan {
        readonly type: 'TsMethodSignature';

        readonly: boolean;
        key: Expression;
        computed: boolean;
        optional: boolean;
        params: TsFnParameter[];

        typeAnnotation?: TsTypeAnnotation;
        typeParams?: TsTypeParameterDeclaration;
    }

    export interface TsIndexSignature extends Node, HasSpan {
        readonly type: 'TsIndexSignature';

        readonly: boolean;
        params: TsFnParameter[];

        typeAnnotation?: TsTypeAnnotation;
    }

    export type TsType = TsKeywordType
        | TsThisType
        | TsFnOrConstructorType
        | TsTypeReference
        | TsTypeQuery
        | TsTypeLiteral
        | TsArrayType
        | TsTupleType
        | TsOptionalType
        | TsRestType
        | TsUnionOrIntersectionType
        | TsConditionalType
        | TsInferType
        | TsParenthesizedType
        | TsTypeOperator
        | TsIndexedAccessType
        | TsMappedType
        | TsLiteralType
        | TsTypePredicate;

    export type TsFnOrConstructorType = TsFunctionType | TsConstructorType;

    export interface TsKeywordType extends Node, HasSpan {
        readonly type: 'TsKeywordType';

        kind: TsKeywordTypeKind
    }

    export type TsKeywordTypeKind = 'any'
        | 'unknown'
        | 'number'
        | 'object'
        | 'boolean'
        | 'bigint'
        | 'string'
        | 'symbol'
        | 'void'
        | 'undefined'
        | 'null'
        | 'never';

    export interface TsThisType extends Node, HasSpan {
        readonly type: 'TsThisType';
    }

    export type TsFnParameter = Identifier | RestElement | ObjectPattern;

    export interface TsFunctionType extends Node, HasSpan {
        readonly type: 'TsFunctionType';

        typeParams?: TsTypeParameterDeclaration;
        typeAnnotation: TsTypeAnnotation;
    }

    export interface TsConstructorType extends Node, HasSpan {
        readonly type: 'TsConstructorType';

        params: TsFnParameter[];

        typeParams?: TsTypeParameterDeclaration;
        typeAnnotation: TsTypeAnnotation;
    }

    export interface TsTypeReference extends Node, HasSpan {
        readonly type: 'TsTypeReference';

        typeName: TsEntityName;
        typeParams?: TsTypeParameterInstantiation;
    }

    export interface TsTypePredicate extends Node, HasSpan {
        readonly type: 'TsTypePredicate';

        paramName: TsThisTypeOrIdent;
        typeAnnotation: TsTypeAnnotation;
    }

    export type TsThisTypeOrIdent = TsThisType | Identifier;

    /**
     * `typeof` operator
     */
    export interface TsTypeQuery extends Node, HasSpan {
        readonly type: 'TsTypeQuery';

        exprName: TsEntityName;
    }

    export interface TsTypeLiteral extends Node, HasSpan {
        readonly type: 'TsTypeLiteral';

        members: TsTypeElement[]
    }

    export interface TsArrayType extends Node, HasSpan {
        readonly type: 'TsArrayType';

        elemType: TsType;
    }

    export interface TsTupleType extends Node, HasSpan {
        readonly type: 'TsTupleType';

        elemTypes: TsType[];
    }

    export interface TsOptionalType extends Node, HasSpan {
        readonly type: 'TsOptionalType';

        typeAnnotation: TsType;
    }

    export interface TsRestType extends Node, HasSpan {
        readonly type: 'TsRestType';

        typeAnnotation: TsType
    }

    export type TsUnionOrIntersectionType = TsUnionType | TsIntersectionType;

    export interface TsUnionType extends Node, HasSpan {
        readonly type: 'TsUnionType';

        types: TsType[]
    }

    export interface TsIntersectionType extends Node, HasSpan {
        readonly type: 'TsIntersectionType';

        types: TsType[];
    }

    export interface TsConditionalType extends Node, HasSpan {
        readonly type: 'TsConditionalType';

        checkType: TsType;
        extendsType: TsType;
        trueType: TsType;
        falseType: TsType;
    }

    export interface TsInferType extends Node, HasSpan {
        readonly type: 'TsInferType';

        typeParam: TsTypeParameter;
    }

    export interface TsParenthesizedType extends Node, HasSpan {
        readonly type: 'TsParenthesizedType';

        typeAnnotation: TsType;
    }

    export interface TsTypeOperator extends Node, HasSpan {
        readonly type: 'TsTypeOperator';

        op: TsTypeOperatorOp;
        typeAnnotation: TsType;
    }

    export type TsTypeOperatorOp = 'keyof' | 'unique';

    export interface TsIndexedAccessType extends Node, HasSpan {
        readonly type: 'TsIndexedAccessType';

        objectType: TsType;
        indexType: TsType;
    }

    export type TruePlusMinus = true | '+' | '-';

    export interface TsMappedType extends Node, HasSpan {
        readonly type: 'TsMappedType';

        readonly?: TruePlusMinus;
        typeParam: TsTypeParameter;
        optional?: TruePlusMinus;
        typeAnnotation?: TsType;
    }

    export interface TsLiteralType extends Node, HasSpan {
        readonly type: 'TsLiteralType';

        literal: TsLiteral;
    }

    export type TsLiteral = NumericLiteral | StringLiteral | BooleanLiteral;

    // // ================
    // // TypeScript declarations
    // // ================

    export interface TsInterfaceDeclaration extends Node, HasSpan {
        readonly type: 'TsInterfaceDeclaration';

        id: Identifier;
        declare: boolean;
        typeParams?: TsTypeParameterDeclaration;
        extends: TsExpressionWithTypeArguments[]
        body: TsInterfaceBody;
    }

    export interface TsInterfaceBody extends Node, HasSpan {
        readonly type: 'TsInterfaceBody';

        body: TsTypeElement[]
    }

    export interface TsExpressionWithTypeArguments extends Node, HasSpan {
        readonly type: 'TsExpressionWithTypeArguments';

        expression: TsEntityName;
        typeParams?: TsTypeParameterInstantiation;
    }

    export interface TsTypeAliasDeclaration extends Node, HasSpan {
        readonly type: 'TsTypeAliasDeclaration';

        declare: boolean;
        id: Identifier;
        typeParams?: TsTypeParameterDeclaration;
        typeAnnotation: TsType;
    }

    export interface TsEnumDeclaration extends Node, HasSpan {
        readonly type: 'TsEnumDeclaration';

        declare: boolean;
        is_const: boolean;
        id: Identifier;
        member: TsEnumMember[];
    }

    export interface TsEnumMember extends Node, HasSpan {
        readonly type: 'TsEnumMember';

        id: TsEnumMemberId,
        init?: Expression,
    }

    export type TsEnumMemberId = Identifier | StringLiteral;

    export interface TsModuleDeclaration extends Node, HasSpan {
        readonly type: 'TsModuleDeclaration';

        declare: boolean;
        global: boolean;
        id: TsModuleName;
        body?: TsNamespaceBody;
    }

    /**
     * `namespace A.B { }` is a namespace named `A` with another TsNamespaceDecl as its body.
     */
    export type TsNamespaceBody = TsModuleBlock | TsNamespaceDeclaration;

    export interface TsModuleBlock extends Node, HasSpan {
        readonly type: 'TsModuleBlock';

        body: ModuleItem[];
    }

    export interface TsNamespaceDeclaration extends Node, HasSpan {
        readonly type: 'TsNamespaceDeclaration';

        declare: boolean;
        global: boolean;
        id: Identifier;
        body: TsNamespaceBody;
    }

    export type TsModuleName = Identifier | StringLiteral;

    export interface TsImportEqualsDeclaration extends Node, HasSpan {
        readonly type: 'TsImportEqualsDeclaration';

        declare: boolean;
        is_export: boolean;
        id: Identifier;
        moduleRef: TsModuleReference
    }

    export type TsModuleReference = TsEntityName | TsExternalModuleReference;

    export interface TsExternalModuleReference extends Node, HasSpan {
        readonly type: 'TsExternalModuleReference';

        expression: Expression;
    }

    export interface TsExportAssignment extends Node, HasSpan {
        readonly type: 'TsExportAssignment';

        expression: Expression;
    }

    export interface TsNamespaceExportDeclaration extends Node, HasSpan {
        readonly type: 'TsNamespaceExportDeclaration';

        id: Identifier;
    }

    export interface TsAsExpression extends ExpressionBase {
        readonly type: 'TsAsExpression';

        expression: Expression;
        typeAnnotation: TsType;
    }

    export interface TsTypeAssertion extends ExpressionBase {
        readonly type: 'TsTypeAssertion';

        expression: Expression;
        typeAnnotation: TsType;
    }

    export interface TsNonNullExpression extends ExpressionBase {
        readonly type: 'TsNonNullExpression';

        expression: Expression;
    }

    export type Accessibility = 'public' | 'protected' | 'private';
}

