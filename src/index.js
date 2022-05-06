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

function extractFromTextGroup(textGroupNode) {
  const code = find(textGroupNode, {
    type: 'inlineCode',
  })?.value;

  if (!code) {
    return {
      text: textGroupNode.children[0].value,
    };
  }

  // strip common chars used for separating code vs text
  return {
    code,
    text: textGroupNode.children
      .map((headingChild) => {
        if (headingChild.type === 'text') {
          return headingChild.value
            .replace(/\)\.$/, '')
            .replace(')', '')
            .replace('(', '')
            .replace(/^\. /, '')
            .trim();
        }
      })
      .filter(Boolean)
      .join(' '),
  };
}

function compiler(tree) {
  const snippets = {};
  visit(tree, 'code', (codeNode, index, { children }) => {
    try {
      let name, description, prefix;

      let i = index - 1;
      while (!name && i >= 0) {
        if (children[i].type === 'code') {
          break;
        }
        if (children[i].type === 'heading') {
          const { text, code } = extractFromTextGroup(children[i]);
          name = text;
          prefix = prefix || code;
          break;
        } else if (children[i].type === 'paragraph') {
          const { text, code } = extractFromTextGroup(children[i]);
          description = text || description;
          prefix = prefix || code;
        } else if (children[i].type === 'blockquote') {
          const inlineCode = find(children[i], { type: 'inlineCode' });
          if (inlineCode) {
            prefix = inlineCode.value;
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
      snippets[name].prefix = prefix;
      snippets[name].body = codeNode.value.split('\n');
      snippets[name].scope = getScope(codeNode).scope;
    } catch (e) {
      if (e instanceof KnownError) {
        throw e;
      }
      throw new Error(e);
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
