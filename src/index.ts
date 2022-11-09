import { readFile } from 'fs/promises';
import { unified } from 'unified';
import markdown from 'remark-parse';
import gfm from 'remark-gfm';
import { FileDoesNotExist } from './errors.js';
import markdownToSnippetPlugin from './plugin.js';

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
    .use(markdownToSnippetPlugin)
    .processSync(input)
    .toString();
  return res;
};
