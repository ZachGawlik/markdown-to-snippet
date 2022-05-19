import { countBy, groupBy } from 'lodash-es';
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
  FileDoesNotExist,
  UserInputError,
} from './errors.js';

const getMdLangs = (codeNode) => {
  if (!codeNode.lang) {
    return null;
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
  return languages;
};

const getScope = (mdLangs) => {
  const scopes = (mdLangs || []).map(
    (lang) =>
      markdownToVscodeLang[lang] ||
      // Fallback to support language scopes added by vscode extensions
      lang
  );
  return scopes.join(',');
};

function extractFromTextGroup(textGroupNode) {
  const code = find(textGroupNode, {
    type: 'inlineCode',
  })?.value;

  if (!code) {
    return {
      text: textGroupNode.children[0].value.trim().replace(/:$/, ''),
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
      .join(' ')
      .replace(/:$/, ''),
  };
}

function compiler(tree) {
  const snippets = {};

  visit(tree, 'code', (codeNode, index, { children }) => {
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
    const scope = getScope(getMdLangs(codeNode));
    if (scope) {
      snippets[name].scope = scope;
    }
  });

  const snippetsByPrefix = groupBy(snippets, (snippet) => snippet.prefix);

  Object.entries(snippetsByPrefix).forEach(([prefix, snippetsForPrefix]) => {
    const scopesForPrefix = snippetsForPrefix.flatMap((snippet) =>
      (snippet.scope || '').split(',')
    );

    if (scopesForPrefix.includes('') && scopesForPrefix.length > 1) {
      throw new UserInputError(
        `Prefix ${prefix} is defined both globally and for scopes ${scopesForPrefix
          .filter(Boolean)
          .join(', ')}`
      );
    }

    const duplicatedScopes = Object.entries(countBy(scopesForPrefix))
      .filter(
        // eslint-disable-next-line no-unused-vars
        ([scope, count]) => count > 1
      )
      .map(([scope]) => scope);

    if (duplicatedScopes.length > 0) {
      throw new UserInputError(
        `Prefix ${prefix} is defined multiple times for scope ${duplicatedScopes.join(
          ', '
        )}`
      );
    }
    if (
      !scopesForPrefix.includes('typescript') &&
      scopesForPrefix.includes('javascript')
    ) {
      const jsSnippetForPrefix = snippetsForPrefix.find((snippet) =>
        snippet.scope.includes('javascript')
      );
      jsSnippetForPrefix.scope = `${jsSnippetForPrefix.scope},${markdownToVscodeLang['typescript']}`;
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
