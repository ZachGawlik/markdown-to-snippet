# Heading 1

## Headings with subheadings get `ignored`

```js
npm install
```

### Prefix not in the heading

`lg1`

```js
console.log($1);
```

### Prefix at end `lge1`

```js
console.log($1);
```

### Prefix at end with parens (`lge2`)

```js
console.log($1);
```

### Prefix at end with colon: `lge3`

```js
console.log($1);
```

### `lgs1` Prefix at start

```js
console.log($1);
```

### `lgs2`: Prefix at start with colon

```js
console.log($1);
```

### (`lgs3`) Prefix at start with parens

```js
console.log($1);
```

### `lgs4`. Prefix at start with period

```js
console.log($1);
```

### Heading _formatting_ does **not** [make](#) its way to snippet name

`lgf`

```js
console.log($1);
```

## Leaf heading ignored for not having prefix

```
console.log($1);
```

## Leaf heading ignored for not having code block - `test`

This should not appear in the json
