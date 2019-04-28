import * as ast from "../ast";
import { ListFormat } from "./list";


export default class Printer {
    text: string = '';
    private indent: number = 0;

    public constructor(
        private readonly pretty: boolean,
    ) { }

    printModule(m: ast.Module): void {
        this.printList(
            this.printModuleItem.bind(this),
            m,
            m.body,
            ListFormat.SourceFileStatements
        );
    }

    printModuleItem(n: ast.ModuleItem): void {
        switch (n.type) {
            case 'ExportDeclaration':
            case 'ExportDefaultDeclaration':
            case 'ExportNamedDeclaration':
            case 'ExportDefaultExpression':
            case 'ImportDeclaration':
            case 'ExportAllDeclaration':
            case 'TsImportEqualsDeclaration':
            case 'TsExportAssignment':
            case 'TsNamespaceExportDeclaration':
                return this.printModuleDeclaration(n);
            default:
                return this.printStatement(n);
        }
    }

    printModuleDeclaration(n: ast.ModuleDeclaration): void {
        switch (n.type) {
            case 'ExportDeclaration':
                return this.printExportDeclaration(n);
            case 'ExportDefaultDeclaration':
                return this.printExportDefaultDeclaration(n);
            case 'ExportNamedDeclaration':
                return this.printExportNamedDeclration(n);
            case 'ExportDefaultExpression':
                return this.printExportDefaultExpression(n);
            case 'ImportDeclaration':
                return this.printImportDeclaration(n);
            case 'ExportAllDeclaration':
                return this.printExportAllDeclration(n);
            case 'TsImportEqualsDeclaration':
                return this.printTsImportEqualsDeclaration(n);
            case 'TsExportAssignment':
                return this.printTsExportAssignment(n);
            case 'TsNamespaceExportDeclaration':
                return this.printTsNamespaceExportDeclaration(n);
        }
    }

    printTsNamespaceExportDeclaration(n: ast.TsNamespaceExportDeclaration): void {
        throw unimpl('TsNamespaceExportDeclaration');
    }

    printTsExportAssignment(n: ast.TsExportAssignment): void {
        throw unimpl('TsExportAssignment');
    }

    printTsImportEqualsDeclaration(n: ast.TsImportEqualsDeclaration): void {
        throw unimpl('TsImportEqualsDeclaration');
    }

    printTsModuleReference(n: ast.TsModuleReference): void {
        switch (n.type) {
            case 'Identifier':
                return this.printIdentifierReference(n);
            case 'TsExternalModuleReference':
                return this.printTsExternalModuleReference(n)
            case 'TsQualifiedName':
                return this.printTsQualifiedName(n)
        }
    }

    printTsExternalModuleReference(n: ast.TsExternalModuleReference): void {
        throw unimpl('TsExternalModuleReference');
    }

    printExportAllDeclration(n: ast.ExportAllDeclaration): void {
        this.p('export');
        this.sp();
        this.p('*');
        this.formattingSpace();
        this.p('from');
        this.formattingSpace();
        this.printStringLiteral(n.source);
    }

    printExportDefaultExpression(n: ast.ExportDefaultExpression): void {
        this.p('export');
        this.sp();
        this.p('default');
        this.sp();
        this.printExpression(n.expression);
    }

    printExportNamedDeclration(n: ast.ExportNamedDeclaration): void {
        this.p('export');
        this.sp();
        this.printList(
            this.printExportSpecifier.bind(this),
            n,
            n.specifiers,
            ListFormat.NamedImportsOrExportsElements,
        );
        if (n.source) {
            this.sp();
            this.p('from');
            this.printStringLiteral(n.source);
        }
    }

    printExportSpecifier(n: ast.ExportSpecifier): void {
        switch (n.type) {
            case 'ExportDefaultSpecifier':
                return this.printExportDefaultSpecifier(n);
            case 'ExportNamespaceSpecifer':
                return this.printExportNamespaceSpecifier(n);
            case 'ExportSpecifier':
                return this.printNamedExportSpecifier(n)
        }
    }

    printNamedExportSpecifier(n: ast.NamedExportSpecifier): void {
        this.printIdentifier(n.orig);

        if (n.exported) {
            this.sp();
            this.p('as');
            this.sp();
            this.printBindingIdentifier(n.exported);
        }
        this.formattingSpace();
    }

    printExportNamespaceSpecifier(n: ast.ExportNamespaceSpecifer): void {
        throw unimpl('ExportNamespaceSpecifer');
    }

    printExportDefaultSpecifier(n: ast.ExportDefaultSpecifier): void {
        throw unimpl('ExportDefaultSpecifier')
    }

    printOptionalStringLiteral(n: ast.StringLiteral | undefined): void {
        if (n) {
            return this.printStringLiteral(n)
        }
    }

    printExportDefaultDeclaration(n: ast.ExportDefaultDeclaration): void {
        this.p('export');
        this.sp();
        this.p('default');
        this.sp();
        this.printDefaultDeclaration(n.decl);
    }

    printDefaultDeclaration(n: ast.DefaultDecl): void {
        switch (n.type) {
            case 'ClassExpression':
                return this.printClassExpression(n);
            case 'FunctionExpression':
                return this.printFunctionExpression(n);
            case 'TsInterfaceDeclaration':
                return this.printTsInterfaceDeclaration(n)
        }
    }

    printFunctionExpression(n: ast.FunctionExpression): void {
        this.p('function');
        if (n.identifier) {
            this.sp();
            this.printIdentifier(n.identifier);
        }
        this.formattingSpace();

        this.printFunctionTrailing(n);
    }

    printClassExpression(n: ast.ClassExpression): void {
        this.p('class');
        if (n.identifier) {
            this.sp();
            this.printClassTrailing(n);
        }
        this.formattingSpace();
        this.printClassTrailing(n);
    }

    printExportDeclaration(n: ast.ExportDeclaration): void {
        this.p('export');
        this.sp();
        this.printDeclaration(n.declaration);
    }

    printArrayExpression(e: ast.ArrayExpression): void {
        this.p('[');
        this.printList(this.printArrayElement.bind(this), e, e.elements, ListFormat.ArrayLiteralExpressionElements);
        this.p(']');
    }

    printArrayElement(e: ast.Expression | ast.SpreadElement | undefined): void {
        if (e && e.type === 'SpreadElement') {
            return this.printSpreadElement(e)
        }
        return this.printOptionalExpression(e)
    }

    printSpreadElement(e: ast.SpreadElement): void {
        this.p('...');
        this.printExpression(e.arguments);
    }

    printOptionalExpression(e: ast.Expression | undefined): void {
        if (e) {
            return this.printExpression(e)
        }
    }

    printArrowFunctionExpression(e: ast.ArrowFunctionExpression): void {

        if (e.async) {
            this.p('async');
            this.formattingSpace()
        }

        if (e.generator) {
            this.p('*');
        }

        this.p('(');
        this.printList(
            this.printPattern.bind(this),
            e,
            e.params,
            ListFormat.CommaListElements,
        );
        this.p(')');

        this.p('=>');

        this.printArrowBody(e.body);
    }

    printArrowBody(body: ast.BlockStatement | ast.Expression): void {
        switch (body.type) {
            case 'BlockStatement':
                return this.printBlockStatement(body)
            default:
                return this.printExpression(body)
        }
    }

    printBlockStatement(block: ast.BlockStatement): void {
        this.p('{');

        this.printList(
            this.printStatement.bind(this),
            block,
            block.stmts,
            ListFormat.MultiLineBlockStatements,
        );

        this.p('}');
    }

    printStatement(stmt: ast.Statement): void {
        switch (stmt.type) {
            case 'ClassDeclaration':
            case 'FunctionDeclaration':
            case 'TsEnumDeclaration':
            case 'TsInterfaceDeclaration':
            case 'TsModuleDeclaration':
            case 'TsTypeAliasDeclaration':
            case 'VariableDeclaration':
                return this.printDeclaration(stmt)

            case 'BreakStatement':
                return this.printBreakStatement(stmt)
            case 'BlockStatement':
                return this.printBlockStatement(stmt);
            case 'ContinueStatement':
                return this.printContinueStatement(stmt);
            case 'DebuggerStatement':
                return this.printDebuggerStatement(stmt);
            case 'DoWhileStatement':
                return this.printDoWhileStatement(stmt);
            case 'EmptyStatement':
                return this.printEmptyStatement(stmt);
            case 'ForInStatement':
                return this.printForInStatement(stmt);
            case 'ForOfStatement':
                return this.printForOfStatement(stmt);
            case 'ForStatement':
                return this.printForStatement(stmt);
            case 'IfStatement':
                return this.printIfStatement(stmt);
            case 'LabeledStatement':
                return this.printLabeledStatement(stmt);
            case 'ReturnStatement':
                return this.printReturnStatement(stmt);
            case 'SwitchStatement':
                return this.printSwitchStatement(stmt);
            case 'ThrowStatement':
                return this.printThrowStatement(stmt);
            case 'TryStatement':
                return this.printTryStatement(stmt);
            case 'WhileStatement':
                return this.printWhileStatement(stmt);
            case 'WithStatement':
                return this.printWithStatement(stmt);

            default:
                return this.printExpressionStatement(stmt);
        }
    }

    printSwitchStatement(n: ast.SwitchStatement): void {
        this.p('swtich');
        this.formattingSpace();
        this.p('(');
        this.printExpression(n.discriminant);
        this.p(')');
        this.formattingSpace();

        this.p('{');
        this.printList(
            this.printSwitchCase.bind(this),
            n,
            n.cases,
            ListFormat.CaseBlockClauses,
        );
        this.p('}');
    }

    printSwitchCase(n: ast.SwitchCase): void {
        if (n.test) {
            this.p('case');
            this.sp();
            this.printExpression(n.test);
        } else {
            this.p('default');
        }
        this.p(':');

        const emitAsSingleStmt = n.consequent.length === 1 && (
            isSynthesized(n) ||
            isSynthesized(n.consequent[0])
        );
        let format: ListFormat = ListFormat.CaseOrDefaultClauseStatements;

        if (emitAsSingleStmt) {
            this.formattingSpace();

            format &= ~(ListFormat.MultiLine | ListFormat.Indented);
        }

        this.printList(
            this.printStatement.bind(this),
            n,
            n.consequent,
            format,
        );
    }

    printIfStatement(n: ast.IfStatement): void {
        this.p('if');
        this.formattingSpace();

        this.p('(');
        this.printExpression(n.test);
        this.p(')');

        const isConsequentBlock = n.consequent.type === 'BlockStatement';

        this.printStatement(n.consequent);

        if (n.alternate) {
            if (isConsequentBlock) {
                this.formattingSpace();
            }
            this.p('else');
            if (startsWithAlphaNum(n.alternate)) {
                this.sp();
            } else {
                this.formattingSpace();
            }
            this.printStatement(n.alternate);
        }
    }

    printOptionalStatement(stmt: ast.Statement | undefined): void {
        if (stmt) {
            return this.printStatement(stmt)
        }
    }

    printBreakStatement(stmt: ast.BreakStatement): void {
        this.p('break');
        if (stmt.label) {
            this.sp();
            this.printIdentifier(stmt.label)
        }
    }

    printWhileStatement(n: ast.WhileStatement): void {
        this.p('while');

        this.p('(');
        this.printExpression(n.test);
        this.p(')');

        this.printStatement(n.body);
    }

    printTryStatement(n: ast.TryStatement): void {
        this.p('try');
        this.formattingSpace();
        this.printBlockStatement(n.block);

        if (n.handler) {
            this.formattingSpace();
            this.printCatchClause(n.handler);
        }

        if (n.finalizer) {
            this.formattingSpace();
            this.p('finally');
            this.printBlockStatement(n.finalizer);
        }
    }

    printCatchClause(n: ast.CatchClause): void {
        this.p('catch');
        this.formattingSpace();


        if (n.param) {
            this.p('(');
            this.printPattern(n.param);
            this.p(')');

            this.formattingSpace();
        }

        this.printBlockStatement(n.body);
    }

    printThrowStatement(n: ast.ThrowStatement): void {
        this.p('throw');
        if (startsWithAlphaNum(n.argument)) {
            this.sp();
        } else {
            this.formattingSpace();
        }
        this.printExpression(n.argument);
    }

    printReturnStatement(n: ast.ReturnStatement): void {
        this.p('return');

        if (n.argument) {
            if (startsWithAlphaNum(n.argument)) {
                this.sp();
            } else {
                this.formattingSpace();
            }
        }
    }

    printLabeledStatement(n: ast.LabeledStatement): void {
        this.printIdentifier(n.label);
        this.p(':');
        this.printStatement(n.body);
    }

    printForStatement(n: ast.ForStatement): void {
        this.p('for');

        this.p('(');

        if (n.init) {
            if (n.init.type === 'VariableDeclaration') {
                this.printVariableDeclaration(n.init);
            } else {
                this.printOptionalExpression(n.init);
            }
        }
        this.p(';');

        if (n.test) {
            this.formattingSpace();
            this.printExpression(n.test);
        }
        this.p(';');

        if (n.update) {
            this.formattingSpace();
            this.printExpression(n.update);
        }

        this.p(')');


        this.printStatement(n.body);
    }

    printForOfStatement(n: ast.ForOfStatement): void {
        this.p('for');


        this.p('(');
        if (n.left.type === 'VariableDeclaration') {
            this.printVariableDeclaration(n.left);
        } else {
            this.printPattern(n.left);
        }

        this.sp();

        this.p('of');

        if (startsWithAlphaNum(n.right)) {
            this.sp();
        } else {
            this.formattingSpace();
        }

        this.printExpression(n.right);
        this.p(')');


        this.printStatement(n.body);
    }

    printForInStatement(n: ast.ForInStatement): void {
        this.p('for');


        this.p('(');
        if (n.left.type === 'VariableDeclaration') {
            this.printVariableDeclaration(n.left);
        } else {
            this.printPattern(n.left);
        }

        this.sp();

        this.p('in');

        if (startsWithAlphaNum(n.right)) {
            this.sp();
        } else {
            this.formattingSpace();
        }

        this.printExpression(n.right);
        this.p(')');


        this.printStatement(n.body);
    }

    printEmptyStatement(n: ast.EmptyStatement): void {
    }

    printDoWhileStatement(n: ast.DoWhileStatement): void {
        this.p('do');

        if (startsWithAlphaNum(n.body)) {
            this.sp();
        } else {
            this.formattingSpace();
        }
        this.printStatement(n.body);

        this.p('while');
        this.formattingSpace();
        this.p('(');
        this.printExpression(n.test);
        this.p(')');
    }

    printDebuggerStatement(stmt: ast.DebuggerStatement): void {
        this.p('debugger');
    }

    printWithStatement(n: ast.WithStatement): void {
        this.p('with');
        this.formattingSpace();

        this.p('(');
        this.printExpression(n.object);
        this.p(')');

        this.printStatement(n.body);
    }

    printDeclaration(n: ast.Declaration): void {
        switch (n.type) {
            case 'ClassDeclaration':
                return this.printClassDeclartion(n);
            case 'FunctionDeclaration':
                return this.printFunctionDeclaration(n);
            case 'TsEnumDeclaration':
                return this.printTsEnumDeclaration(n);
            case 'TsInterfaceDeclaration':
                return this.printTsInterfaceDeclaration(n);
            case 'TsModuleDeclaration':
                return this.printTsModuleDeclaration(n);
            case 'TsTypeAliasDeclaration':
                return this.printTsTypeAliasDeclaration(n);
            case 'VariableDeclaration':
                return this.printVariableDeclaration(n);
        }
    }

    printVariableDeclaration(n: ast.VariableDeclaration): void {
        this.p(n.kind);
        this.sp();

        this.printList(
            this.printVariableDeclarator.bind(this),
            n,
            n.declarations,
            ListFormat.VariableDeclarationList,
        )
    }

    printVariableDeclarator(n: ast.VariableDeclarator): void {
        this.printPattern(n.id);

        if (n.init) {
            this.formattingSpace();
            this.p('=');
            this.formattingSpace();
            this.printExpression(n.init);
        }

    }

    printTsTypeAliasDeclaration(n: ast.TsTypeAliasDeclaration): void {
        throw unimpl('TsTypeAliasDeclaration');
    }

    printTsModuleDeclaration(n: ast.TsModuleDeclaration): void {
        throw unimpl('TsModuleDeclaration');
    }

    printTsModuleName(n: ast.TsModuleName): void {
        switch (n.type) {
            case 'Identifier':
                return this.printBindingIdentifier(n)
            case 'StringLiteral':
                return this.printStringLiteral(n)
        }
    }

    printTsNamespaceBody(
        n: ast.TsNamespaceBody
    ): void {
        if (n) {
            switch (n.type) {
                case 'TsModuleBlock':
                    return this.printTsModuleBlock(n);
                case 'TsNamespaceDeclaration':
                    return this.printTsNamespaceDeclaration(n);
            }
        }
    }

    printTsNamespaceDeclaration(n: ast.TsNamespaceDeclaration): void {
        throw unimpl('TsNamespaceDeclaration')

    }

    printTsModuleBlock(n: ast.TsModuleBlock): void {
        throw unimpl('TsModuleBlock');
    }

    printTsInterfaceDeclaration(n: ast.TsInterfaceDeclaration): void {
        throw unimpl('TsInterfaceDeclaration');
    }

    printTsInterfaceBody(n: ast.TsInterfaceBody): void {
        throw unimpl('TsInterfaceBody');
    }

    printTsTypeElement(n: ast.TsTypeElement): void {
        throw unimpl('TsTypeElement');
    }

    printTsEnumDeclaration(n: ast.TsEnumDeclaration): void {
        throw unimpl('TsEnumDeclaration')
    }

    printTsEnumMember(n: ast.TsEnumMember): void {
        throw unimpl('TsEnumMember')
    }

    printTsEnumMemberId(n: ast.TsEnumMemberId): void {
        switch (n.type) {
            case 'Identifier':
                return this.printBindingIdentifier(n);
            case 'StringLiteral':
                return this.printStringLiteral(n)
        }
    }

    printFunctionDeclaration(n: ast.FunctionDeclaration): void {
        this.p('function');
        this.sp();
        this.printIdentifier(n.identifier);
        this.formattingSpace();

        this.printFunctionTrailing(n);
    }

    printClassDeclartion(n: ast.ClassDeclaration): void {
        this.p('class');

        this.sp();
        this.printClassTrailing(n);
        this.formattingSpace();

        this.printClassTrailing(n);
    }

    printClassMember(member: ast.ClassMember): void {
        switch (member.type) {
            case 'ClassMethod':
                return this.printClassMethod(member);
            case 'ClassProperty':
                return this.printClassProperty(member);
            case 'Constructor':
                return this.printConstructor(member);
            case 'PrivateMethod':
                return this.printPrivateMethod(member);
            case 'PrivateProperty':
                return this.printPrivateProperty(member);
            case 'TsIndexSignature':
                return this.printTsIndexSignature(member);
        }
    }

    printTsIndexSignature(n: ast.TsIndexSignature): void {
        throw unimpl('TsIndexSignature');
    }

    printTsFnParameter(n: ast.TsFnParameter): void {
        throw unimpl('TsFnParameter');
    }

    printPrivateProperty(n: ast.PrivateProperty): void {
        throw unimpl('PrivateProperty');
    }

    printPrivateMethod(n: ast.PrivateMethod): void {
        throw unimpl('PrivateMethod');
    }

    printPrivateName(n: ast.PrivateName): void {
        throw unimpl('PrivateName');
    }

    printConstructor(n: ast.Constructor): void {
        this.p('constructor');
        this.p('(');
        this.printList(
            this.printConstructorParameter.bind(this),
            n,
            n.params,
            ListFormat.Parameters,
        );
        this.p(')');

        if (n.body) {
            this.printBlockStatement(n.body);
        }

    }

    printConstructorParameter(n: ast.Pattern | ast.TsParameterProperty): void {
        switch (n.type) {
            case 'TsParameterProperty':
                return this.printTsParameterProperty(n)
            default:
                return this.printPattern(n)
        }
    }

    printTsParameterProperty(n: ast.TsParameterProperty): void {
        throw unimpl('TsParameterProperty')
    }

    printTsParameterPropertyParameter(n: ast.TsParameterPropertyParameter): void {
        throw unimpl('TsParameterPropertyParameter');
    }

    printPropertyName(key: ast.PropertyName): void {
        switch (key.type) {
            case 'Identifier':
                return this.printBindingIdentifier(key);
            case 'StringLiteral':
                return this.printStringLiteral(key);
            case 'NumericLiteral':
                return this.printNumericLiteral(key);
            default:
                return this.printExpression(key);
        }
    }


    printAccessibility(n: ast.Accessibility | undefined): void {
        if (n) {
            throw unimpl('Accessibility')
        }
    }

    printClassProperty(n: ast.ClassProperty): void {
        throw unimpl('ClassProperty');
    }

    printClassMethod(n: ast.ClassMethod): void {
        if (n.is_static) {
            this.p('static');
            this.sp();
        }

        switch (n.kind) {
            case 'method':
                if (n.function.async) {
                    this.p('async');
                    this.sp();
                }

                if (n.function.generator) {
                    this.p('*');
                }

                this.printExpression(n.key);
                break;

            case 'getter':
                this.p('get');
                this.sp();

                this.printExpression(n.key);
                break;

            case 'setter':
                this.p('set');
                this.sp();

                break;
        }

        this.printFunctionTrailing(n.function);
    }

    private printClassTrailing(n: ast.Class): void {
        if (n.superClass) {
            this.sp();
            this.p('extends');
            this.sp();
            this.printExpression(n.superClass);
        }

        this.p('{');
        this.printList(
            this.printClassMember.bind(this),
            n,
            n.body,
            ListFormat.ClassMembers,
        );
        this.p('}');
    }

    private printFunctionTrailing(n: ast.Fn): void {
        this.p('(');
        this.printList(
            this.printPattern.bind(this),
            n,
            n.params,
            ListFormat.CommaListElements,
        );
        this.p(')');

        this.formattingSpace();
        if (n.body) {
            this.printBlockStatement(n.body);
        }
    }

    printTsExpressionWithTypeArguments(n: ast.TsExpressionWithTypeArguments): void {
        throw unimpl('TsExpressionWithTypeArguments');
    }

    printTsTypeParameterInstantiation(n: ast.TsTypeParameterInstantiation | undefined): void {
        if (n) {
            throw unimpl('TsTypeParameterInstantiation');
        }
    }

    printTsEntityName(n: ast.TsEntityName): void {
        switch (n.type) {
            case 'Identifier':
                return this.printBindingIdentifier(n)
            case 'TsQualifiedName':
                return this.printTsQualifiedName(n)
        }
    }

    printTsQualifiedName(n: ast.TsQualifiedName): void {
        throw unimpl('TsQualifiedName')
    }

    printDecorator(n: ast.Decorator): void {
        throw unimpl('Decorator');
    }

    printExpressionStatement(expr: ast.Expression): void {
        this.printExpression(expr)
    }

    printContinueStatement(stmt: ast.ContinueStatement): void {
        this.p('continue');
        if (stmt.label) {
            this.sp();
            this.printIdentifier(stmt.label)
        }
    }

    printExpression(n: ast.Expression): void {
        switch (n.type) {
            case 'ArrayExpression':
                return this.printArrayExpression(n)
            case 'ArrowFunctionExpression':
                return this.printArrowFunctionExpression(n)
            case 'AssignmentExpression':
                return this.printAssignmentExpression(n)
            case 'AwaitExpression':
                return this.printAwaitExpression(n)
            case 'BinaryExpression':
                return this.printBinaryExpression(n)
            case 'BooleanLiteral':
                return this.printBooleanLiteral(n)
            case 'CallExpression':
                return this.printCallExpression(n)
            case 'ClassExpression':
                return this.printClassExpression(n)
            case 'ConditionalExpression':
                return this.printConditionalExpression(n)
            case 'FunctionExpression':
                return this.printFunctionExpression(n)
            case 'Identifier':
                return this.printIdentifierReference(n)
            case 'JSXElement':
                return this.printJSXElement(n)
            case 'JSXEmptyExpression':
                return this.printJSXEmptyExpression(n)
            case 'JSXFragment':
                return this.printJSXFragment(n)
            case 'JSXMemberExpression':
                return this.printJSXMemberExpression(n)
            case 'JSXNamespacedName':
                return this.printJSXNamespacedName(n)
            case 'JSXText':
                return this.printJSXText(n)
            case 'MemberExpression':
                return this.printMemberExpression(n)
            case 'MetaProperty':
                return this.printMetaProperty(n)
            case 'NewExpression':
                return this.printNewExpression(n)
            case 'NullLiteral':
                return this.printNullLiteral(n)
            case 'NumericLiteral':
                return this.printNumericLiteral(n)
            case 'ObjectExpression':
                return this.printObjectExpression(n)
            case 'ParenthesisExpression':
                return this.printParenthesisExpression(n)
            case 'PrivateName':
                return this.printPrivateName(n)
            case 'RegExpLiteral':
                return this.printRegExpLiteral(n)
            case 'SequenceExpression':
                return this.printSequenceExpression(n)
            case 'StringLiteral':
                return this.printStringLiteral(n)
            case 'TaggedTemplateExpression':
                return this.printTaggedTemplateExpression(n)
            case 'TemplateLiteral':
                return this.printTemplateLiteral(n)
            case 'ThisExpression':
                return this.printThisExpression(n)
            case 'TsAsExpression':
                return this.printTsAsExpression(n)
            case 'TsNonNullExpression':
                return this.printTsNonNullExpression(n)
            case 'TsTypeAssertion':
                return this.printTsTypeAssertion(n)
            case 'TsTypeCastExpression':
                return this.printTsTypeCastExpression(n)
            case 'UnaryExpression':
                return this.printUnaryExpression(n)
            case 'UpdateExpression':
                return this.printUpdateExpression(n)
            case 'YieldExpression':
                return this.printYieldExpression(n)
        }
    }

    printAssignmentExpression(n: ast.AssignmentExpression): void {
        this.printPatternOrExpressison(n.left);
        this.formattingSpace();
        this.p('=');
        this.formattingSpace();
        this.printExpression(n.right);
    }

    printPatternOrExpressison(n: ast.Pattern | ast.Expression): void {
        switch (n.type) {
            case 'ObjectPattern':
            case 'ArrayPattern':
            case 'Identifier':
            case 'AssignmentPattern':
            case 'RestElement':
                return this.printPattern(n)
            default:
                return this.printExpression(n)
        }
    }

    printYieldExpression(n: ast.YieldExpression): void {
        this.p('yield');
        if (n.argument) {
            if (startsWithAlphaNum(n.argument)) {
                this.sp();
            } else {
                this.formattingSpace();
            }

            this.printExpression(n.argument)
        }
    }

    printUpdateExpression(n: ast.UpdateExpression): void {
        if (n.prefix) {
            this.p(n.operator);
            this.printExpression(n.argument);
        } else {
            this.printExpression(n.argument);
            this.p(n.operator);
        }
    }

    printUnaryExpression(n: ast.UnaryExpression): void {
        this.p(n.operator);

        const needFormattingSpace = n.operator === 'typeof' ||
            n.operator === 'void' ||
            n.operator === 'delete';

        if (shouldEmitWsBeforeOperand(n)) {
            this.sp();
        } else {
            if (needFormattingSpace) {
                this.formattingSpace();
            }
        }

        this.printExpression(n.argument);
    }

    printTsTypeCastExpression(n: ast.TsTypeCastExpression): void {
        throw unimpl('TsTypeCastExpression');
    }

    printTsTypeAssertion(n: ast.TsTypeAssertion): void {
        throw unimpl('TsTypeAssertion');
    }

    printTsNonNullExpression(n: ast.TsNonNullExpression): void {
        throw unimpl('TsNonNullExpression');
    }

    printTsAsExpression(n: ast.TsAsExpression): void {
        throw unimpl('TsAsExpression');
    }

    printThisExpression(n: ast.ThisExpression): void {
        this.p('this');
    }

    printTemplateLiteral(n: ast.TemplateLiteral): void {
        this.printTpl(n);
    }

    printTaggedTemplateExpression(n: ast.TaggedTemplateExpression): void {
        this.printExpression(n.tag);
        this.printTpl(n);
    }

    private printTpl(n: ast.TplBase): void {
        for (let i = 0; i < n.expressions.length + n.quasis.length; i++) {
            const idx = Math.floor(i / 2);

            if (i % 2 == 0) {
                this.printTemplateElement(n.quasis[idx]);
            } else {
                this.p('${');
                this.printExpression(n.expressions[idx]);
                this.p('}');
            }
        }
    }

    printTemplateElement(n: ast.TemplateElement): void {
        this.p(n.raw.value);
    }

    printSequenceExpression(n: ast.SequenceExpression): void {
        this.printList(
            this.printExpression.bind(this),
            n,
            n.expressions,
            ListFormat.CommaListElements,
        );
    }

    printRegExpLiteral(n: ast.RegExpLiteral): void {
        this.p('/');
        this.printStringLiteral(n.pattern);
        this.p('/');
        if (n.flags) {
            this.printStringLiteral(n.flags);
        }
    }

    printParenthesisExpression(n: ast.ParenthesisExpression): void {
        this.p('(');
        this.printExpression(n.expression);
        this.p(')');
    }

    printObjectExpression(n: ast.ObjectExpression): void {
        this.p('{');
        this.printList(
            this.printObjectProperty.bind(this),
            n,
            n.properties,
            ListFormat.ObjectLiteralExpressionProperties,
        );
        this.p('}');
    }

    printObjectProperty(n: ast.Property | ast.SpreadElement): void {
        switch (n.type) {
            case 'SpreadElement':
                return this.printSpreadElement(n)
            default:
                return this.printProperty(n)
        }
    }

    printProperty(n: ast.Property): void {
        switch (n.type) {
            case 'Identifier':
                return this.printIdentifier(n)
            case 'AssignmentProperty':
                return this.printAssignmentProperty(n)
            case 'GetterProperty':
                return this.printGetterProperty(n)
            case 'KeyValueProperty':
                return this.printKeyValueProperty(n)
            case 'MethodProperty':
                return this.printMethodProperty(n)
            case 'SetterProperty':
                return this.printSetterProperty(n)
        }
    }

    printSetterProperty(n: ast.SetterProperty): void {
        this.p('set');
        this.sp();
        this.printExpression(n.key);
        this.sp();

        this.p('(');
        this.printPattern(n.param);
        this.p(')');

        if (n.body) {
            this.printStatement(n.body);
        }
    }

    printMethodProperty(n: ast.MethodProperty): void {
        if (n.async) {
            this.p('async');
            this.sp();
        }

        if (n.generator) {
            this.p('*');
        }

        this.printExpression(n.key);
        this.formattingSpace();

        this.printFunctionTrailing(n);
    }

    printKeyValueProperty(n: ast.KeyValueProperty): void {
        this.printExpression(n.key);
        this.p(':');
        this.formattingSpace();
        this.printExpression(n.value);
    }

    printGetterProperty(n: ast.GetterProperty): void {
        this.p('get');
        this.sp();
        this.printExpression(n.key);
        this.sp();

        this.p('(');
        this.p(')');

        if (n.body) {
            this.printStatement(n.body);
        }
    }

    printAssignmentProperty(n: ast.AssignmentProperty): void {
        this.printIdentifier(n.key);
        this.p('=');
        this.formattingSpace();
        this.printExpression(n.value);
    }

    printNullLiteral(n: ast.NullLiteral): void {
        this.p('null');
    }

    printNewExpression(n: ast.NewExpression): void {
        this.p('new');
        this.sp();
        this.printExpression(n.callee);
        if (n.arguments) {
            this.p('(');
            this.printList(
                this.printArgument.bind(this),
                n,
                n.arguments,
                ListFormat.NewExpressionArguments
            );
            this.p(')');
        }
    }

    printTsTypeArguments(n: ast.TsTypeParameterInstantiation | undefined): void {
        if (n) {
            throw unimpl('TsTypeParameterInstantiation');
        }
    }

    printArgument(n: ast.SpreadElement | ast.Expression): void {
        switch (n.type) {
            case 'SpreadElement':
                return this.printSpreadElement(n);
            default:
                return this.printExpression(n)
        }

    }

    printMetaProperty(n: ast.MetaProperty): void {
        this.printIdentifierReference(n.meta);
        this.p('.');
        this.printIdentifier(n.property);
    }

    printMemberExpression(n: ast.MemberExpression): void {
        this.printExpressionOrSuper(n.object);
        if (n.computed) {
            this.p('[');
            this.printExpression(n.property);
            this.p(']');
        } else {
            this.p('.');
            this.printExpression(n.property);
        }
    }

    printExpressionOrSuper(n: ast.Expression | ast.Super): void {
        if (n.type === 'Super') {
            this.p('super');
        } else {
            return this.printExpression(n)
        }
    }

    printJSXText(n: ast.JSXText): void {
        throw unimpl('JSXText')
    }

    printJSXNamespacedName(n: ast.JSXNamespacedName): void {
        throw unimpl('JSXNamespacedName');
    }

    printJSXMemberExpression(n: ast.JSXMemberExpression): void {
        throw unimpl('JSXMemberExpression');
    }

    printJSXObject(n: ast.JSXObject): void {
        switch (n.type) {
            case 'Identifier':
                return this.printIdentifierReference(n);
            case 'JSXMemberExpression':
                return this.printJSXMemberExpression(n)
        }
    }

    printJSXFragment(n: ast.JSXFragment): void {
        throw unimpl('JSXFragment')
    }

    printJSXClosingFragment(n: ast.JSXClosingFragment): void {
        throw unimpl('JSXClosingFragment')
    }

    printJSXElementChild(n: ast.JSXElementChild): void {
        switch (n.type) {
            case 'JSXElement':
                return this.printJSXElement(n);
            case 'JSXExpressionContainer':
                return this.printJSXExpressionContainer(n);
            case 'JSXFragment':
                return this.printJSXFragment(n);
            case 'JSXSpreadChild':
                return this.printJSXSpreadChild(n);
            case 'JSXText':
                return this.printJSXText(n)

        }
    }

    printJSXExpressionContainer(n: ast.JSXExpressionContainer): void {
        throw unimpl('JSXExpressionContainer');
    }

    printJSXSpreadChild(n: ast.JSXSpreadChild): void {
        throw unimpl('JSXSpreadChild');
    }

    printJSXOpeningFragment(n: ast.JSXOpeningFragment): void {
        throw unimpl('JSXOpeningFragment')

    }

    printJSXEmptyExpression(n: ast.JSXEmptyExpression): void {
    }

    printJSXElement(n: ast.JSXElement): void {
        throw unimpl('JSXElement')
    }

    printJSXClosingElement(n: ast.JSXClosingElement | undefined): void {
        if (n) {
            throw unimpl('JSXClosingElement')
        }
    }

    printJSXElementName(n: ast.JSXElementName): void {
        switch (n.type) {
            case 'Identifier':
                return this.printIdentifierReference(n)
            case 'JSXMemberExpression':
                return this.printJSXMemberExpression(n)
            case 'JSXNamespacedName':
                return this.printJSXNamespacedName(n)
        }
    }

    printJSXOpeningElement(n: ast.JSXOpeningElement): void {
        throw unimpl('JSXOpeningElement');
    }

    printJSXAttributeOrSpread(n: ast.JSXAttributeOrSpread): void {
        switch (n.type) {
            case 'JSXAttribute':
                return this.printJSXAttribute(n)
            case 'SpreadElement':
                return this.printSpreadElement(n)
        }
    }

    printJSXAttribute(n: ast.JSXAttribute): void {
        throw unimpl('JSXAttribute');
    }

    printJSXAttributeName(n: ast.JSXAttributeName): void {
        switch (n.type) {
            case 'Identifier':
                return this.printIdentifierReference(n)
            case 'JSXNamespacedName':
                return this.printJSXNamespacedName(n)
        }
    }

    printConditionalExpression(n: ast.ConditionalExpression): void {
        this.printExpression(n.test);
        this.formattingSpace();
        this.p('?');
        this.formattingSpace();
        this.printExpression(n.consequent);
        this.formattingSpace();
        this.p(':');
        this.formattingSpace();
        this.printExpression(n.alternate);
    }

    printCallExpression(n: ast.CallExpression): void {
        this.printExpressionOrSuper(n.callee);

        this.p('(');
        this.printList(
            this.printArgument.bind(this),
            n,
            n.arguments,
            ListFormat.CallExpressionArguments
        );
        this.p(')');
    }

    printBooleanLiteral(n: ast.BooleanLiteral): void {
        this.p(n.value ? 'true' : 'false');
    }

    printBinaryExpression(n: ast.BinaryExpression): void {
        const needSpace = n.operator === 'in' || n.operator === 'instanceof';

        this.printExpression(n.left);

        const needPreSpace = needSpace || (n.left.type === 'UpdateExpression' && !n.left.prefix);

        if (needPreSpace) {
            this.sp();
        } else {
            this.formattingSpace()
        }

        this.p(n.operator);

        const needPostSpace = needSpace || (n.right.type === 'UpdateExpression' && n.right.prefix);

        if (needPostSpace) {
            this.sp();
        } else {
            this.formattingSpace()
        }

        this.printExpression(n.right);

    }

    printAwaitExpression(n: ast.AwaitExpression): void {
        this.p('await');
        this.sp();
        this.printExpression(n.argument);
    }

    printTsTypeParameterDeclaration(
        n: ast.TsTypeParameterDeclaration | undefined
    ): void {
        if (n) {
            throw unimpl('TsTypeParameterDeclaration');
        }
    }

    printTsTypeParameter(n: ast.TsTypeParameter): void {
        throw unimpl('TsTypeParameter')
    }

    printTsTypeAnnotation(a: ast.TsTypeAnnotation | undefined): void {
        if (a) {
            throw unimpl('TsTypeAnnotation')
        }
    }

    printTsType(n: ast.TsType): void {
        throw unimpl('TsType')
    }

    printImportDeclaration(n: ast.ImportDeclaration): void {
        this.p('import');

        const specifiers: ast.NamedImportSpecifier[] = [];
        let emittedDefault = false, emittedNs = false;

        if (n.specifiers) {
            for (const specifier of n.specifiers) {
                switch (specifier.type) {
                    case 'ImportSpecifier':
                        specifiers.push(specifier);
                        break;

                    case 'ImportDefaultSpecifier':
                        emittedDefault = true;

                        this.printIdentifier(specifier.local);
                        break;

                    case 'ImportNamespaceSpecifier':
                        emittedNs = true;

                        this.p('*');
                        this.sp();
                        this.p('as');
                        this.sp();
                        this.printIdentifier(specifier.local);
                        break;
                }
            }
        }

        if (specifiers.length === 0) {
            this.sp();
            if (emittedDefault || emittedNs) {
                this.p('from');
            }
        } else {
            if (emittedDefault) {
                this.p(',');
                this.formattingSpace();
            }

            this.p('{');
            this.printList(
                this.printNamedImportSpecifier.bind(this),
                n,
                specifiers,
                ListFormat.NamedImportsOrExportsElements,
            );
            this.p('}');
            this.formattingSpace();

            this.p('from');
        }

        this.formattingSpace();
        this.printStringLiteral(n.source);
        this.p(';');
    }

    printNamedImportSpecifier(n: ast.NamedImportSpecifier): void {
        if (n.imported) {
            this.printIdentifier(n.imported);
            this.sp();
            this.p('as');
            this.sp();
        }

        this.printBindingIdentifier(n.local);
    }

    private printBindingIdentifier(i: ast.Identifier): void {
        this.printIdentifier(i)
    }

    private printIdentifierReference(i: ast.Identifier): void {
        this.printIdentifier(i)
    }

    printIdentifier(n: ast.Identifier): void {
        this.p(n.value);
        if (n.optional) {
            this.p('?');
        }
        this.printTsTypeAnnotation(n.typeAnnotation);
    }

    printStringLiteral(n: ast.StringLiteral): void {
        const value = n.value.replace("\\", "\\\\")
            .replace('\{0008}', "\\b")
            .replace('\{000C}', "\\f")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t")
            .replace('\{000B}', "\\v")
            .replace("\o00", "\\x000")
            .replace("\o01", "\\x001")
            .replace("\o02", "\\x002")
            .replace("\o03", "\\x003")
            .replace("\o04", "\\x004")
            .replace("\o05", "\\x005")
            .replace("\o06", "\\x006")
            .replace("\o07", "\\x007")
            .replace("\o08", "\\x008")
            .replace("\o09", "\\x009")
            .replace("\o0", "\\0");


        if (n.value.indexOf("'") === -1) {
            this.p("'");
            this.p(n.value);
            this.p("'");
            return;
        }

        if (n.value.indexOf('"') === -1) {
            this.p('"');
            this.p(n.value);
            this.p('"');
            return;
        }

        this.p(`'`);
        this.p(value.replace("'", "\\'"));
        this.p(`'`)
    }

    printNumericLiteral(n: ast.NumericLiteral): void {
        this.p(n.value.toString())
    }

    printPattern(n: ast.Pattern): void {
        switch (n.type) {
            case 'Identifier':
                return this.printBindingIdentifier(n);
            case 'ArrayPattern':
                return this.printArrayPattern(n);
            case 'ObjectPattern':
                return this.printObjectPattern(n);
            case 'AssignmentPattern':
                return this.printAssignmentPattern(n)
            case 'RestElement':
                return this.printRestElement(n)
            default:
                return this.printExpression(n)
        }
    }

    printRestElement(n: ast.RestElement): void {
        this.p('...');
        this.printPattern(n.argument);
    }

    printAssignmentPattern(n: ast.AssignmentPattern): void {
        this.printPattern(n.left);
        this.formattingSpace();
        this.p('=');
        this.formattingSpace();
        this.printExpression(n.right);
    }

    printObjectPattern(n: ast.ObjectPattern): void {
        this.p('{');
        this.printList(
            this.printObjectPatternProperty.bind(this),
            n,
            n.properties,
            ListFormat.ObjectBindingPatternElements,
        );
        this.p('}');
    }

    printObjectPatternProperty(n: ast.ObjectPatternProperty): void {
        switch (n.type) {
            case 'AssignmentPatternProperty':
                return this.printAssignmentPatternProperty(n);
            case 'KeyValuePatternProperty':
                return this.printKeyValuePatternProperty(n);
            case 'RestElement':
                return this.printRestElement(n);
        }
    }

    printKeyValuePatternProperty(n: ast.KeyValuePatternProperty): void {
        this.printPropertyName(n.key);
        this.p(':');
        this.formattingSpace();
        this.printPattern(n.value);
    }

    printAssignmentPatternProperty(n: ast.AssignmentPatternProperty): void {
        this.printBindingIdentifier(n.key);
        if (n.value) {
            this.formattingSpace();
            this.p('=');
            this.formattingSpace();
            this.printExpression(n.value);
        }
    }

    printArrayPattern(n: ast.ArrayPattern): void {
        this.p('[');
        this.printList(
            this.printArrayPatternElement.bind(this),
            n,
            n.elements,
            ListFormat.ArrayBindingPatternElements,
        );
        this.p(']');
    }

    printArrayPatternElement(n: (ast.Pattern | undefined)): void {
        if (n) {
            this.printPattern(n)
        }
    }

    printInterpreter(n: string | undefined): void {
        if (n) {
            this.text += `#!${n}\n`
        }
    }

    private printList<N>(
        emit: (node: N) => void,
        parentNode: ast.HasSpan,
        children: N[] | undefined,
        format: ListFormat,
        start = 0,
        count = children ? children.length - start : 0,
    ) {
        const isUndefined = children === undefined;
        if (isUndefined && format & ListFormat.OptionalIfUndefined) {
            return;
        }

        const isEmpty = children === undefined || start >= children.length || count === 0;
        if (isEmpty && format & ListFormat.OptionalIfEmpty) {
            return;
        }

        if (format & ListFormat.BracketsMask) {
            this.p(getOpeningBracket(format));
            if (isEmpty && !isUndefined) {
                // Emit comments within empty bracketed lists
                // TODO: children.lo()
                this.emitTrailingCommentsOfPosition(parentNode.span.start, /*prefixSpace*/ true);
            }
        }

        if (isEmpty) {
            // Write a line terminator if the parent node was multi-line
            if (format & ListFormat.MultiLine) {
                if (this.pretty) {
                    this.line();
                }
            } else if (format & ListFormat.SpaceBetweenBraces && !(format & ListFormat.NoSpaceIfEmpty)) {
                if (this.pretty) {
                    this.sp();
                }
            }
        } else {
            // Write the opening line terminator or leading whitespace.
            const mayEmitInterveningComments = (format & ListFormat.NoInterveningComments) === 0;
            let shouldEmitInterveningComments = mayEmitInterveningComments;
            if (shouldWriteLeadingLineTerminator(parentNode.span!, children!, format)) { // TODO: GH#18217
                if (this.pretty) {
                    this.line();
                }
                shouldEmitInterveningComments = false;
            } else if (format & ListFormat.SpaceBetweenBraces) {
                this.formattingSpace()
            }

            // Increase the indent, if requested.
            if (format & ListFormat.Indented) {
                if (this.pretty) {
                    this.increaseIndent();
                }
            }

            // Emit each child.
            let previousSibling: ast.Span | undefined;
            let shouldDecreaseIndentAfterEmit = false;
            for (let i = 0; i < count; i++) {
                const child = children![start + i];

                // Write the delimiter if this is not the first node.
                if (previousSibling) {
                    // i.e
                    //      function commentedParameters(
                    //          /* Parameter a */
                    //          a
                    //          /* End of parameter a */ -> this comment isn't considered to be trailing comment of parameter "a" due to newline
                    //          ,
                    if (format & ListFormat.DelimitersMask && previousSibling.end !== parentNode.span!.end) {
                        this.emitLeadingCommentsOfPosition(previousSibling.end);
                    }
                    this.printDelimiter(format);

                    // Write either a line terminator or whitespace to separate the elements.
                    if (shouldWriteSeparatingLineTerminator(previousSibling, child, format)) {
                        // If a synthesized node in a single-line list starts on a new
                        // line, we should increase the indent.
                        if ((format & (ListFormat.LinesMask | ListFormat.Indented)) === ListFormat.SingleLine) {
                            this.increaseIndent();
                            shouldDecreaseIndentAfterEmit = true;
                        }

                        if (this.pretty) {
                            this.line();
                        }
                        shouldEmitInterveningComments = false;
                    } else if (previousSibling && format & ListFormat.SpaceBetweenSiblings) {
                        this.formattingSpace();
                    }
                }

                // Emit this child.
                if (shouldEmitInterveningComments) {
                    const commentRange: ast.Span = (child as any as ast.HasSpan).span;
                    if (commentRange) {
                        this.emitTrailingCommentsOfPosition(commentRange.start);
                    }
                } else {
                    shouldEmitInterveningComments = mayEmitInterveningComments;
                }

                emit(child);

                if (shouldDecreaseIndentAfterEmit) {
                    if (this.pretty) {
                        this.decreaseIndent();
                    }
                    shouldDecreaseIndentAfterEmit = false;
                }

                previousSibling = (child as any as ast.HasSpan).span;
            }

            // Write a trailing comma, if requested.
            const hasTrailingComma = (format & ListFormat.AllowTrailingComma) && false;
            if (format & ListFormat.CommaDelimited && hasTrailingComma) {
                this.p(",");
            }


            // Emit any trailing comment of the last element in the list
            // i.e
            //       var array = [...
            //          2
            //          /* end of element 2 */
            //       ];
            if (previousSibling &&
                format & ListFormat.DelimitersMask &&
                previousSibling.end !== parentNode.span.end) {
                this.emitLeadingCommentsOfPosition(previousSibling.end);
            }

            // Decrease the indent, if requested.
            if (format & ListFormat.Indented) {
                if (this.pretty) {
                    this.decreaseIndent();
                }
            }

            // Write the closing line terminator or closing whitespace.
            if (shouldWriteClosingLineTerminator(parentNode.span, children!, format)) {
                if (this.pretty) {
                    this.line();
                }
            }
            else if (format & ListFormat.SpaceBetweenBraces) {
                this.formattingSpace();
            }
        }

        if (format & ListFormat.BracketsMask) {
            if (isEmpty && !isUndefined) {
                // Emit leading comments within empty lists
                // TODO: children.end
                this.emitLeadingCommentsOfPosition(parentNode.span.end);
            }
            this.p(getClosingBracket(format));
        }
    }

    private emitLeadingCommentsOfPosition(
        pos: number,
    ) { }

    private emitTrailingCommentsOfPosition(
        pos: number,
        prefixSpace?: boolean,
    ) { }

    private line(): void {
        this.p('\n');
    }

    private p(s: string): void {
        this.text += s;
    }

    private increaseIndent(): void {
        this.indent++;
    }

    private decreaseIndent(): void {
        this.indent++;
    }

    /**
     * Print a space
     */
    private sp(): void {
        this.text += ' ';
    }

    /**
     * Print a space
     */
    private formattingSpace(): void {
        if (this.pretty) {
            this.text += ' ';
        }
    }

    private printDelimiter(format: ListFormat) {
        switch (format & ListFormat.DelimitersMask) {
            case ListFormat.None:
                break;
            case ListFormat.CommaDelimited:
                this.p(",");
                break;
            case ListFormat.BarDelimited:
                this.sp();
                this.p("|");
                break;
            case ListFormat.AsteriskDelimited:
                this.sp();
                this.p("*");
                this.sp();
                break;
            case ListFormat.AmpersandDelimited:
                this.sp();
                this.p("&");
                break;
        }
    }
}


const brackets = createBracketsMap();
function createBracketsMap() {
    const brackets: string[][] = [];
    brackets[ListFormat.Braces] = ["{", "}"];
    brackets[ListFormat.Parenthesis] = ["(", ")"];
    brackets[ListFormat.AngleBrackets] = ["<", ">"];
    brackets[ListFormat.SquareBrackets] = ["[", "]"];
    return brackets;
}

function getOpeningBracket(format: ListFormat) {
    return brackets[format & ListFormat.BracketsMask][0];
}

function getClosingBracket(format: ListFormat) {
    return brackets[format & ListFormat.BracketsMask][1];
}

function unimpl(type: string): Error {
    return new Error(`not implemented yet: codegen of ${type}`);
}

function isSpan(n: any): n is ast.Span {
    return n.start && n.end && n.ctxt
}

function isSynthesized(n: ast.Span | any): boolean {
    if (isSpan(n)) {
        return n.ctxt !== 0
    }

    const s = n as ast.HasSpan;
    return !!(s.span && s.span.ctxt !== 0)
}

function startsWithAlphaNum(n: ast.Pattern | ast.Expression | ast.Statement | ast.Super): boolean {
    switch (n.type) {
        case 'Super':
        case 'Identifier':
        case 'BooleanLiteral':
        case 'NumericLiteral':
        case 'NullLiteral':
        case 'AwaitExpression':
        case 'FunctionExpression':
        case 'ClassExpression':
        case 'ThisExpression':
        case 'YieldExpression':
        case 'NewExpression':
        case 'MetaProperty':
            return true;

        case 'PrivateName':
            return false;

        case 'StringLiteral':
        case 'RegExpLiteral':
        case 'TemplateLiteral':
            return false;

        case 'SequenceExpression':
            if (n.expressions.length !== 0) {
                return startsWithAlphaNum(n.expressions[0])
            }
            return false;

        case 'AssignmentExpression':
            return startsWithAlphaNum(n.left);

        case 'BinaryExpression':
            return startsWithAlphaNum(n.left);

        case 'ConditionalExpression':
            return startsWithAlphaNum(n.test);

        case 'CallExpression':
            return startsWithAlphaNum(n.callee);

        case 'MemberExpression':
            return startsWithAlphaNum(n.object);

        case 'UnaryExpression':
            if (n.operator === 'void' || n.operator === 'typeof' || n.operator === 'delete') return true;
            return false;

        case 'ArrowFunctionExpression':
            return false;

        case 'TemplateLiteral':
        case 'UpdateExpression':
        case 'ArrayExpression':
        case 'ObjectExpression':
        case 'ParenthesisExpression':
            return false;

        case 'TaggedTemplateExpression':
            return startsWithAlphaNum(n.tag);

        case 'JSXEmptyExpression':
            return false;


        case 'JSXFragment':
        case 'JSXElement':
            return false;

        case 'JSXNamespacedName':
            return true;

        case 'JSXMemberExpression':
            // return startsWithAlphaNum(n.object)
            return true

        case 'TsTypeAssertion':
            return false;

        case 'TsNonNullExpression':
            return startsWithAlphaNum(n.expression);

        case 'TsAsExpression':
            return startsWithAlphaNum(n.expression);

        case 'TsTypeCastExpression':
            return startsWithAlphaNum(n.expression);




        // -------------------------
        //
        //         Patterns
        //
        // -------------------------

        case 'AssignmentPattern':
            return startsWithAlphaNum(n.left);

        case 'ObjectPattern':
        case 'ArrayPattern':
        case 'RestElement':
            return false;


        // -------------------------
        //
        //        Statements
        //
        // -------------------------
        case 'DebuggerStatement':
        case 'WithStatement':
        case 'WhileStatement':
        case 'DoWhileStatement':
        case 'ReturnStatement':
        case 'LabeledStatement':
        case 'BreakStatement':
        case 'ContinueStatement':
        case 'SwitchStatement':
        case 'ThrowStatement':
        case 'TryStatement':
        case 'ForStatement':
        case 'ForInStatement':
        case 'ForOfStatement':
        case 'IfStatement':
            return true;
        case 'BlockStatement':
            return false


        case 'ClassDeclaration':
        case 'FunctionDeclaration':
        case 'VariableDeclaration':
        case 'TsEnumDeclaration':
        case 'TsInterfaceDeclaration':
        case 'TsModuleDeclaration':
        case 'TsTypeAliasDeclaration':
            return true;
    }

    return true;
}

function shouldEmitWsBeforeOperand(n: ast.UnaryExpression): boolean {
    if (n.operator === 'void' || n.operator === 'typeof' || n.operator === 'delete') {
        return startsWithAlphaNum(n.argument);
    }

    if (n.operator === '+') {
        if (n.argument.type === 'UpdateExpression' && n.argument.operator === '++' && n.argument.prefix) {
            return true;
        }
        if (n.argument.type === 'UnaryExpression' && n.argument.operator === '+') {
            return true;
        }
    }

    if (n.operator === '-') {
        if (n.argument.type === 'UpdateExpression' && n.argument.operator === '--' && n.argument.prefix) {
            return true;
        }
        if (n.argument.type === 'UnaryExpression' && n.argument.operator === '-') {
            return true;
        }

    }

    return false;
}


function shouldWriteLeadingLineTerminator<N>(parentNode: ast.Span, children: N[], format: ListFormat): boolean {
    if (format & ListFormat.MultiLine) {
        return true;
    }

    if (format & ListFormat.PreserveLines) {
        if (format & ListFormat.PreferNewLine) {
            return true;
        }

        const firstChild = children[0];
        if (firstChild === undefined) {
            return !isOnSingleLine(parentNode);
        } else if (isSynthesized(parentNode) || isSynthesized(firstChild)) {
            return synthesizedNodeStartsOnNewLine(firstChild, format);
        } else {
            const fcSpan = getSpan(firstChild)
            if (fcSpan)
                return !isOnSameLine(parentNode, fcSpan);
        }
    }


    return false
}

function getSpan(n: any): ast.Span | undefined {
    if (isSpan(n)) return n;
    return (n as ast.HasSpan).span
}

function isOnSingleLine(sp: ast.Span): boolean {
    if (sp.loc)
        return sp.loc.start.line === sp.loc.end.line
    return false;
}

function isOnSameLine(l: ast.Span, r: ast.Span): boolean {
    return l.loc.start.line === r.loc.start.line
}

function shouldWriteSeparatingLineTerminator<N>(
    previousNode: ast.Span | undefined,
    nextNode: N,
    format: ListFormat
): boolean {
    if (format & ListFormat.MultiLine) {
        return true;
    } else if (format & ListFormat.PreserveLines) {
        if (previousNode === undefined || nextNode === undefined) {
            return false;
        } else if (isSynthesized(previousNode) || isSynthesized(nextNode)) {
            return synthesizedNodeStartsOnNewLine(previousNode, format) || synthesizedNodeStartsOnNewLine(nextNode, format);
        } else {
            const nnSpan = getSpan(nextNode);
            if (nnSpan)
                return !isOnSameLine(previousNode, nnSpan);
            return false;
        }
    } else {
        return getStartsOnNewLine(nextNode);
    }
}

function shouldWriteClosingLineTerminator(parentNode: ast.Span, children: any[], format: ListFormat) {
    if (format & ListFormat.MultiLine) {
        return (format & ListFormat.NoTrailingNewLine) === 0;
    }
    else if (format & ListFormat.PreserveLines) {
        if (format & ListFormat.PreferNewLine) {
            return true;
        }

        const lastChild = lastOrUndefined(children);
        if (lastChild === undefined) {
            return !isOnSingleLine(parentNode);
        } else if (isSynthesized(parentNode) || isSynthesized(lastChild)) {
            return synthesizedNodeStartsOnNewLine(lastChild, format);
        } else {
            return !isOnSameLine(parentNode, lastChild!);
        }
    } else {
        return false;
    }
}


function synthesizedNodeStartsOnNewLine<N>(node: N, format: ListFormat) {
    if (isSynthesized(node)) {
        const startsOnNewLine = getStartsOnNewLine(node);
        if (startsOnNewLine === undefined) {
            return (format & ListFormat.PreferNewLine) !== 0;
        }

        return startsOnNewLine;
    }

    return (format & ListFormat.PreferNewLine) !== 0;
}

function lastOrUndefined<T>(l: T[]): T | undefined {
    if (l) {
        return l[l.length]
    }
}

function getStartsOnNewLine(n: any): boolean {
    const sp = getSpan(n);
    if (!sp || !sp.loc) {
        return false;
    }
    return sp.loc.start.line !== sp.loc.end.line
}