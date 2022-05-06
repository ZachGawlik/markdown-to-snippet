import { readFile } from 'fs/promises';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
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
    try {
      let name, description, prefixNode;

      let i = index - 1;
      while (!name && i >= 0) {
        if (children[i].type === 'code') {
          break;
        }
        if (children[i].type === 'heading') {
          if (children[i].children[0].type === 'text') {
            name = children[i].children[0].value;
          }
          break;
        }
        const inlineCode = find(children[i], { type: 'inlineCode' });
        if (inlineCode) {
          prefixNode = inlineCode;
        }
        if (children[i].type === 'paragraph') {
          if (children[i].children[0].type === 'text') {
            description = children[i].children[0].value;
          }
        }
        i--;
      }

      if (!name) {
        throw new MarkdownParsingError('Could not find heading for snippet', {
          snippet: codeNode.value,
        });
      }

      snippets[name] = {};
      if (description) {
        snippets[name].description = description;
      }
      snippets[name].prefix = prefixNode.value;
      snippets[name].body = codeNode.value.split('\n');
      snippets[name].scope = getScope(codeNode).scope;
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
