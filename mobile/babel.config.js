// Babel plugin that replaces dynamic import() expressions that carry webpack
// magic comments (/* webpackIgnore */ / /* @vite-ignore */) with a safe
// Promise.resolve().then(require) fallback. Hermes cannot parse these comments
// inside import() — they appear in @supabase/supabase-js >= 2.49 for the
// optional OpenTelemetry tracing path.
function transformMagicImports({ types: t }) {
  return {
    name: 'transform-magic-imports',
    visitor: {
      CallExpression(path) {
        if (!t.isImport(path.node.callee)) return;
        const args = path.node.arguments;
        if (!args.length) return;

        // Check for webpackIgnore / @vite-ignore in any comment position
        const allComments = [
          ...(path.node.innerComments || []),
          ...(path.node.leadingComments || []),
          ...args.flatMap((a) => [
            ...(a.innerComments || []),
            ...(a.leadingComments || []),
            ...(a.trailingComments || []),
          ]),
        ];
        const hasMagicComment = allComments.some(
          (c) => c.value.includes('webpackIgnore') || c.value.includes('@vite-ignore'),
        );
        if (!hasMagicComment) return;

        // Replace import(expr) with:
        //   Promise.resolve().then(() => { try { return require(expr); } catch(e) { return null; } })
        const cleanArg = t.cloneNode(args[0], true);
        cleanArg.innerComments = [];
        cleanArg.leadingComments = [];
        cleanArg.trailingComments = [];

        const errId = path.scope.generateUidIdentifier('e');
        const requireCall = t.callExpression(t.identifier('require'), [cleanArg]);
        const tryStmt = t.tryStatement(
          t.blockStatement([t.returnStatement(requireCall)]),
          t.catchClause(errId, t.blockStatement([t.returnStatement(t.nullLiteral())])),
        );
        const arrowFn = t.arrowFunctionExpression([], t.blockStatement([tryStmt]));
        const replacement = t.callExpression(
          t.memberExpression(
            t.callExpression(
              t.memberExpression(t.identifier('Promise'), t.identifier('resolve')),
              [],
            ),
            t.identifier('then'),
          ),
          [arrowFn],
        );
        path.replaceWith(replacement);
      },
    },
  };
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      transformMagicImports,
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
            '@testflow/shared': '../packages/shared/src',
          },
        },
      ],
    ],
  };
};
