## Snippet with two variations

> prefix: `usr`

```js
const ${1} = useRef(${2:null});
```

```ts
const ${1} = useRef<$2>(${3:null});
```

## Snippet with two variations and paragraph in between

> prefix: `uss`

Untyped:

```js
const ${1} = useState(${2:null});
```

Typescript:

```ts
const ${1} = useState<$2>(${3:null});
```


Removed description field from all prefixes. Description is barely used by
vscode (only shown in Insert Menu snippet).
The value gained from it is much less than the value detracted if the
description gets input with nonsense that's only intende to be additional
information to the person reading the markdown document