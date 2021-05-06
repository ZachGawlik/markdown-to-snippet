const fs = require('fs/promises');
const unified = require('unified');
const visit = require('unist-util-visit');
const find = require('unist-util-find');
const markdown = require('remark-parse');
const gfm = require('remark-gfm');
const report = require('vfile-reporter');
const markdownToVscodeLang = require('./markdownToVscodeLang');
const Errors = require('./errors');

const getScope = (codeNode) => {
  if (!codeNode.lang) {
    return {};
  }
  const languages = [codeNode.lang.toLowerCase()];
  if (codeNode.meta) {
    languages.push(
      ...codeNode.meta
        .split(' ')
        .filter(Boolean) // clean up blanks if multiple spaces separated entries
        .map((l) => l.trim().toLowerCase())
    );
  }

  const scopes = languages.map(
    (lang) =>
      markdownToVscodeLang[lang] ||
      // Fallback to support language scopes added by vscode extensions
      lang
  );
  return { scope: scopes.join(',') };
};

function compiler(tree) {
  const snippets = {};
  visit(tree, 'code', (codeNode, index, { children }) => {
    let hasDescription = false;
    try {
      let nameNode = children[index - 2];
      if (nameNode?.type !== 'heading') {
        if (children[index - 3]?.type === 'heading') {
          hasDescription = true;
          nameNode = children[index - 3];
        } else {
          // TODO: throw error, no heading found
        }
      }

      let prefixNode, description;
      if (hasDescription) {
        if (find(children[index - 2], { type: 'inlineCode' })) {
          prefixNode = find(children[index - 2], { type: 'inlineCode' });
          description = find(children[index - 1], { type: 'text' })?.value;
        } else {
          prefixNode = find(children[index - 1], { type: 'inlineCode' });
          description = find(children[index - 2], { type: 'text' })?.value;
        }
      } else {
        prefixNode = find(children[index - 1], { type: 'inlineCode' });
      }
      if (!prefixNode) {
        // throw error, no inline code prefix anywhere
      }

      const name = nameNode.children[0].value;
      snippets[name] = {
        description: description || name,
        prefix: prefixNode.value,
        body: codeNode.value.split('\n'),
        ...getScope(codeNode),
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
  let input;
  try {
    input = await fs.readFile(filepath, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw new Errors.FileDoesNotExist(`File does not exist`, { filepath });
    }
    throw new Error(e);
  }

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
