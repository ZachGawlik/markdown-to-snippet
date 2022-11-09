# Headings with lower subheadings get `ignored`

## Log 1 (`lg1`)

```js
console.log($1);
```

<!-- markdown-to-snippet start -->
## Log 2 (`lg2`)

```js
console.log($1);
```
<!-- markdown-to-snippet end -->

## Log 3 (`lg3`)

```js
console.log($1);
```

<!-- markdown-to-snippet start -->
## Headings with lower subheadings still get `ignored` inside zones

```js
// ignored codeblock that will not become a snippet
```

### Log 4 (`lg4`)

```js
console.log($1);
```

<!-- markdown-to-snippet end -->

## Log 5 (`lg5`)

```js
console.log($1);
```

<!-- markdown-to-snippet start -->

## Enabled region with no snippet

<!-- markdown-to-snippet end -->