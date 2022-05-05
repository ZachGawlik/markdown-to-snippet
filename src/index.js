import { readFile } from 'fs/promises';
import unified from 'unified';
import visit from 'unist-util-visit';
import find from 'unist-util-find';
import markdown from 'remark-parse';
import gfm from 'remark-gfm';
import report from 'vfile-reporter';
import markdownToVscodeLang from './markdownToVscodeLang.js';
import {
  MarkdownParsingError,
  KnownError,
  FileDoesNotExist,
} from './errors.js';

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
          throw new MarkdownParsingError('Could not find heading for snippet', {
            snippet: codeNode.value,
          });
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
      if (e instanceof KnownError) {
        throw e;
      }
      throw new Error('Yikes, couldnt parse');
    }
  });
  return JSON.stringify(snippets, null, 2);
}

function markdownToSnippetCompiler() {
  this.Compiler = compiler;
}

export const markdownToSnippet = async (filepath) => {
  let input;
  try {
    input = await readFile(filepath, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw new FileDoesNotExist(`File does not exist`, { filepath });
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
