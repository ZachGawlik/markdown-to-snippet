const fs = require('fs/promises');
const unified = require('unified');
const visit = require('unist-util-visit');
const find = require('unist-util-find');
const markdown = require('remark-parse');
const gfm = require('remark-gfm');
const report = require('vfile-reporter');

const getBody = (codeString) => codeString.split('\n');

// TODO: handle more languages
const getScope = (language) => {
  const scopes = (() => {
    if (['js'].includes(language)) {
      return ['javascript', 'javascriptreact'];
    } else if (['ts'].includes(language)) {
      return ['typescript', 'typescriptreact'];
    }
    return [];
  })();
  return scopes.length > 0 ? { scope: scopes.join(',') } : {};
};

function compiler(tree) {
  const snippets = {};
  visit(tree, 'code', (codeNode, index, parentNode) => {
    try {
      const nameNode = parentNode.children[index - 2];
      if (!nameNode || nameNode.type !== 'heading') {
        // TODO: throw error... ideally through vfile message
      }
      const name = nameNode.children[0].value;

      const nodeWithPrefix = parentNode.children[index - 1];
      const prefix = find(nodeWithPrefix, { type: 'inlineCode' });
      if (!prefix) {
        // TODO: throw error... ideally through vfile message
      }
      snippets[name] = {
        description: name,
        prefix: prefix.value,
        body: getBody(codeNode.value),
        ...getScope(codeNode.lang),
      };
    } catch (e) {
      throw new Error('Yikes, couldnt parse');
    }
  });
  return JSON.stringify(snippets, null, 2);
}

function markdownToSnippetCompiler() {
  this.Compiler = compiler;
}

const markdownToSnippet = async (filepath) => {
  const input = await fs.readFile(filepath, 'utf8');
  const res = unified()
    .use(markdown)
    .use(gfm)
    .use(markdownToSnippetCompiler)
    .processSync(input, function (err) {
      if (err) {
        console.error(report(err));
      }
    })
    .toString();
  return res;
};

module.exports = {
  markdownToSnippet,
};
