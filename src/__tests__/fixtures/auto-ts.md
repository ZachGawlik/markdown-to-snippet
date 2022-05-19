## JS snippet that will have TS auto-added

> prefix: `lg`

```js
console.log($1);
```

## JS snippet that won't have TS auto-added

> prefix: `usr`

```js
const ${1} = useRef(${2:null});
```

## JS snippet's separate TS version

> prefix: `usr`

```ts
const ${1} = useRef<$2>(${3:null});
```