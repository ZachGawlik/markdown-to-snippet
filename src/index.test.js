const { markdownToSnippet } = require('.');

describe('Markdown to snippet', () => {
  test("doesn't error", () => {
    expect(markdownToSnippet()).toEqual('Hello world');
  });
});
