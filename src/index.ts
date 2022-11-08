import { readFile } from 'fs/promises';
import { visit } from 'unist-util-visit';
import { countBy, groupBy } from 'lodash-es';
import { unified, Plugin, CompilerFunction } from 'unified';
import markdown from 'remark-parse';
import gfm from 'remark-gfm';
import type { Code, Heading, InlineCode, Paragraph, Root } from 'mdast';
import { toString } from 'mdast-util-to-string';
import { select } from 'unist-util-select';
import markdownToVscodeLang from './markdownToVscodeLang.js';
import {
  MarkdownParsingError,
  FileDoesNotExist,
  UserInputError,
} from './errors.js';

const getMdLangs = (codeNode: Code) => {
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

const getScope = (mdLangs: string[] | null) => {
  const scopes = (mdLangs || []).map(
    (lang) =>
      markdownToVscodeLang[lang] ||
      // Fallback to support language scopes added by vscode extensions
      lang
  );
  return scopes.join(',');
};

function extractFromTextGroup(textGroupNode: Heading | Paragraph) {
  const inlineCode = (select('inlineCode', textGroupNode) as InlineCode | null)
    ?.value;

  if (!inlineCode) {
    return {
      text: toString(textGroupNode).replace(/:$/, ''),
    };
  }

  // strip common chars used for separating inlineCode vs text
  return {
    inlineCode,
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

type Snippet = {
  prefix: string;
  body: string[];
  scope?: string;
};

const markdownToSnippetCompiler: CompilerFunction<Root, string> = (tree) => {
  const snippets: Record<string, Snippet> = {};

  visit(tree, 'heading', (headingNode, index) => {
    if (index === null) {
      // not possible, as all mdASTs have 'root' root node
      return;
    }
    const siblingNodes = tree.children;
    const codeNodes: Code[] = [];

    for (let x = index + 1; x < siblingNodes.length; x++) {
      const sibling = siblingNodes[x];
      if (sibling.type === 'heading' && sibling.depth > headingNode.depth) {
        return;
      }
    }

    const { text: headingText, inlineCode } = extractFromTextGroup(headingNode);
    const name = headingText;
    let prefix = inlineCode;
    let i = index + 1;
    while (i < siblingNodes.length) {
      const sibling = siblingNodes[i];
      if (sibling.type === 'heading') {
        break;
      } else if (sibling.type === 'paragraph') {
        const { inlineCode } = extractFromTextGroup(sibling);
        if (!prefix) {
          prefix = inlineCode;
        }
      } else if (sibling.type === 'blockquote') {
        const inlineCode = select('inlineCode', sibling) as InlineCode | null;
        if (inlineCode) {
          prefix = inlineCode.value;
        }
      } else if (sibling.type === 'code') {
        codeNodes.push(sibling);
      }
      i++;
    }

    if (!prefix || codeNodes.length === 0) {
      return;
    }

    if (snippets[name]) {
      // Constrained by VSCode's snippet format using name as the object key
      throw new MarkdownParsingError(`Found duplicate heading ${name}`);
    }

    const p = prefix;
    codeNodes.forEach((codeNode, index) => {
      const mdLangs = getMdLangs(codeNode);
      const newSnippet: Snippet = {
        prefix: p,
        body: codeNode.value.split('\n'),
        scope: getScope(mdLangs) || undefined,
      };
      snippets[index === 0 ? name : `${name} (${mdLangs})`] = newSnippet;
    });
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
      .filter(([_a, count]) => count > 1)
      .map(([scope]) => scope);

    if (duplicatedScopes.length > 0) {
      throw new UserInputError(
        `Prefix ${prefix} is defined multiple times for scope ${duplicatedScopes.join(
          ', '
        )}`
      );
    }
  });

  return JSON.stringify(snippets, null, 2);
};

function MyCompiler(this: Plugin<[], Root, string>) {
  Object.assign(this, { Compiler: markdownToSnippetCompiler });
}

function isErrnoException(e: unknown): e is NodeJS.ErrnoException {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ('code' in (e as any)) return true;
  else return false;
}

export const markdownToSnippet = async (filepath: string) => {
  let input;
  try {
    input = await readFile(filepath, 'utf8');
  } catch (e) {
    if (isErrnoException(e) && e?.code === 'ENOENT') {
      throw new FileDoesNotExist(`File does not exist`, { filepath });
    }
    throw e;
  }

  const res = await unified()
    .use(markdown)
    .use(gfm)
    .use(MyCompiler)
    .processSync(input)
    .toString();
  return res;
};
