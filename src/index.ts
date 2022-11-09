import { readFile } from 'fs/promises';
import { countBy, groupBy } from 'lodash-es';
import { unified, Plugin, CompilerFunction } from 'unified';
import markdown from 'remark-parse';
import gfm from 'remark-gfm';
import type {
  BlockContent,
  Code,
  Heading,
  InlineCode,
  Paragraph,
  Root,
} from 'mdast';
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
    return [];
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

const getScope = (mdLangs: string[]) => {
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

type RawSnippet = {
  prefix: string;
  body: string[];
  langs: string[];
};
type Snippet = {
  prefix: string;
  body: string[];
  scope?: string;
};

type NonHeadingBlockContent = Exclude<BlockContent, Heading>;
type NestedHeading = {
  headingNode: Heading;
  contents: NonHeadingBlockContent[];
};

const getLeafHeadings = (root: Root) => {
  const nestedHeadings: NestedHeading[] = [];

  for (let i = 0; i < root.children.length; i += 1) {
    const child = root.children[i];
    const previousHeading =
      nestedHeadings.length > 0 && nestedHeadings[nestedHeadings.length - 1];
    if (child.type === 'heading') {
      const newHeading: NestedHeading = {
        headingNode: child,
        contents: [],
      };
      if (previousHeading && previousHeading.headingNode.depth < child.depth) {
        nestedHeadings[nestedHeadings.length - 1] = newHeading;
      } else {
        nestedHeadings.push(newHeading);
      }
    } else if (previousHeading) {
      previousHeading.contents.push(child as NonHeadingBlockContent);
    }
  }
  return nestedHeadings;
};

const getRawSnippetsByHeading = (nestedHeadings: NestedHeading[]) => {
  const snippetsByHeading: Record<string, RawSnippet[]> = {};
  nestedHeadings.map(({ headingNode, contents }) => {
    const { text: snippetName, inlineCode } = extractFromTextGroup(headingNode);
    if (snippetsByHeading[snippetName]) {
      throw new MarkdownParsingError(
        `Found duplicate heading ${snippetName}. Two snippets with the same name are impossible for VSCode's snippet format`
      );
    }

    const snippetsForHeading: RawSnippet[] = [];
    let prefix = inlineCode;
    contents.forEach((content) => {
      if (!prefix && ['blockquote', 'paragraph'].includes(content.type)) {
        prefix = (select('inlineCode', content) as InlineCode | undefined)
          ?.value;
      } else if (prefix && content.type === 'code') {
        snippetsForHeading.push({
          prefix,
          body: content.value.split('\n'),
          langs: getMdLangs(content),
        });
      }
    });
    snippetsByHeading[snippetName] = snippetsForHeading;
  });
  return snippetsByHeading;
};

const formatSnippetForVsCode = (
  rawSnippetsByHeading: Record<string, RawSnippet[]>
) => {
  const snippets: Record<string, Snippet> = {};
  Object.entries(rawSnippetsByHeading).forEach(([snippetName, rawSnippets]) => {
    rawSnippets.forEach(({ prefix, body, langs }, index) => {
      const formattedSnippet = {
        prefix,
        body,
        scope: getScope(langs) || undefined,
      };
      if (index === 0) {
        snippets[snippetName] = formattedSnippet;
      } else {
        snippets[`${snippetName} (${langs.join(' ')})`] = formattedSnippet;
      }
    });
  });
  return snippets;
};

const assertOneSnippetPerPrefixLang = (snippets: Record<string, Snippet>) => {
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
};

const markdownToSnippetCompiler: CompilerFunction<Root, string> = (tree) => {
  const nestedHeadings = getLeafHeadings(tree);
  const rawSnippetsByHeading = getRawSnippetsByHeading(nestedHeadings);
  const snippets = formatSnippetForVsCode(rawSnippetsByHeading);
  assertOneSnippetPerPrefixLang(snippets);
  return JSON.stringify(snippets, null, 2);
};

function MarkdownToSnippetPlugin(this: Plugin<[], Root, string>) {
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
    .use(MarkdownToSnippetPlugin)
    .processSync(input)
    .toString();
  return res;
};
