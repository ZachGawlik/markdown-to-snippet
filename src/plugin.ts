import { countBy, groupBy } from 'lodash-es';
import type { Plugin, CompilerFunction } from 'unified';
import type {
  TopLevelContent,
  Code,
  Heading,
  InlineCode,
  Paragraph,
  Root,
} from 'mdast';
import { toString } from 'mdast-util-to-string';
import { select } from 'unist-util-select';
import { zone } from 'mdast-zone';
import { getVscodeScope } from './markdownToVscodeLang.js';
import { MarkdownParsingError, UserInputError } from './errors.js';

const MD_ZONE_ID = 'markdown-to-snippet';

// MDAST type defs miss that root.children can only be TopLevelContent[]
const getEnabledZones = (root: Root) => {
  const zones: TopLevelContent[][] = [];
  zone(root, MD_ZONE_ID, (_, zoneContents) => {
    zones.push(zoneContents as TopLevelContent[]);
  });
  return zones.length === 0 ? [root.children as TopLevelContent[]] : zones;
};

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

type NestedHeading = {
  headingNode: Heading;
  contents: Exclude<TopLevelContent, Heading>[];
};

const getLeafHeadings = (blockContent: TopLevelContent[]) => {
  const nestedHeadings: NestedHeading[] = [];

  for (let i = 0; i < blockContent.length; i += 1) {
    const child = blockContent[i];
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
      previousHeading.contents.push(child);
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
        scope: getVscodeScope(langs) || undefined,
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

const markdownToSnippetCompiler: CompilerFunction<Root, string> = (root) => {
  const zones = getEnabledZones(root);
  const nestedHeadings = zones.flatMap(getLeafHeadings);

  const rawSnippetsByHeading = getRawSnippetsByHeading(nestedHeadings);
  const snippets = formatSnippetForVsCode(rawSnippetsByHeading);
  assertOneSnippetPerPrefixLang(snippets);
  return JSON.stringify(snippets, null, 2);
};

function MarkdownToSnippetPlugin(this: Plugin<[], Root, string>) {
  Object.assign(this, { Compiler: markdownToSnippetCompiler });
}

export default MarkdownToSnippetPlugin;
