/*

Maps GitHub markdown language identifiers to built-in VSCode identifiers.

If a snippet's codeblock specifies a language, the snippet will only be available to files that VSCode recognizes as that language.
Specifying the language also brings the benefit of syntax-highlighting the markdown.

To add a snippet to all files regardless of type, define a codeblock without specifying a language.

Additional languages can be added to VSCode through extensions.
Even though the language won't appear in the below list, a snippet specifying the language will be restricted to those files.

References:
 * VSCode built-in language scopes for snippets https://code.visualstudio.com/docs/languages/identifiers#_known-language-identifiers
 * VSCode markdown code block languages https://github.com/microsoft/vscode-markdown-tm-grammar/blob/main/syntaxes/markdown.tmLanguage
 * GitHub markdown code block languages https://github.com/github/linguist/blob/32ec19c013a7f81ffaeead25e6e8f9668c7ed574/lib/linguist/languages.yml

*/

const markdownToVscodeLang: Record<string, string> = {
  abap: 'abap',

  bat: 'bat',

  bibtex: 'bibtex',

  c: 'c',

  'c++': 'cpp',
  cpp: 'cpp',

  csharp: 'csharp',
  'c#': 'csharp',
  cake: 'csharp',
  cakescript: 'csharp',

  clojure: 'clojure',

  coffeescript: 'coffeescript',
  'coffee-script': 'coffeescript',
  coffee: 'coffeescript',

  css: 'css,less,scss',

  dockerfile: 'dockerfile',

  fsharp: 'fsharp',
  'f#': 'fsharp',

  go: 'go',

  groovy: 'groovy',

  haml: 'haml',

  handlebars: 'handlebars',
  hbs: 'handlebars',

  html: 'html',
  xhtml: 'html',

  ini: 'ini',

  java: 'java',

  javascript: 'javascript,javascriptreact',
  js: 'javascript,javascriptreact',
  jsx: 'javascript,javascriptreact,jsx',
  node: 'javascript,javascriptreact',

  json: 'json,jsonc',
  jsonc: 'jsonc',

  latex: 'latex',

  less: 'less',

  lua: 'lua',

  makefile: 'makefile',
  make: 'makefile',
  mf: 'makefile',
  bsdmake: 'makefile',

  'obj-c': 'objective-c',
  objc: 'objective-c',
  objectivec: 'objective-c',

  'obj-c++': 'objective-cpp',
  'objc++': 'objective-cpp',
  'objectivec++': 'objective-cpp',

  perl: 'perl',

  perl6: 'perl6',

  plaintext: 'plaintext',

  powershell: 'powershell',

  pug: 'pug',
  jade: 'pug',

  py: 'python',
  py3: 'python',
  python: 'python',
  python3: 'python',

  r: 'r',

  razor: 'razor',
  cshtml: 'razor',

  ruby: 'ruby',
  rb: 'ruby',
  rbx: 'ruby',

  rust: 'rust',

  scss: 'scss',

  shaderlab: 'shaderlab',

  shellscript: 'shellscript',
  'shell-script': 'shellscript',
  bash: 'shellscript',
  sh: 'shellscript',
  zsh: 'shellscript',

  slim: 'slim',

  sql: 'sql',
  pgsql: 'sql',
  sqlpl: 'sql',
  mysql: 'sql',
  tsql: 'sql',

  stylus: 'stylus',

  swift: 'swift',

  typescript: 'typescript,typescriptreact',
  ts: 'typescript,typescriptreact',
  tsx: 'typescript,typescriptreact',

  tex: 'tex',

  vb: 'vb',

  vue: 'vue',

  xml: 'xml',
  xsd: 'xml',
  rss: 'xml',
  wsdl: 'xml',

  xsl: 'xsl',
  xslt: 'xsl',

  yaml: 'yaml',
  yml: 'yaml',
};

export default markdownToVscodeLang;
