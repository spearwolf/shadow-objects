shadow-tree: parent elements (aka context elements) by shadow-type
===================================================================

### the following tree is given

```
<CC>
|
+-- <A1>
    |
    +-- <B1>
        |
        +-- <A2>
            |
            +-- <B2>
                |
                +-- <A3>
                |
                +-- <A4>
                |   |
                |   +-- <B3>
                |
                +-- <B4>
```

- `A2.getContextByType(A)` &rarr; `A1`
- `A2.getContextByType(B)` &rarr; `B1`
- `B3.getContextByType(B)` &rarr; `A4`
- `B4.getContextByType(A)` &rarr; `A2`
- `A2.getChildrenOfContext(A)` &rarr; `A3`, `A4`
- `A2.getChildrenOfContext(B)` &rarr; `B2`
- `B2.getChildrenOfContext(B)` &rarr; `B3`, `B4`


### A context/shadow tree

```
A1
|
+-- A2
    |
    +-- A3
    |
    +-- A4
```

### B context/shadow tree

```
B1
|
+-- B2
    |
    +-- B3
    |
    +-- B4
```

usage scenarios
---------------

### disconnect A2

- all children-of-context of A2 will loose their parents-by-context
- all descendants of A2 are automatically _disconnected_, therefore it is not necessary to explicitly inform the descendants
  - _disconnected_: the browser calls the `disconnectedCallback()` for A2 and all descendents
- the only thing A2 has to do is detach itself from all parents-by-context

### context: parents-by-type for A2

| type | element |
|------|---------|
| A    | A1      |
| B    | B1      |
| CC   | CC      |

### who calls what

- within `disconnectedCallback()` the element must disconnect from all parents-by-type:
  - the `onChildRemovedFromContext()` is called for each parent/context element
- after that, the browser calls `disconnectedCallback()` for all descendants (all in the disconnected subtree):
  - A2, B2, A3, A4, B3, B4

### how the tree looks afterwards

```
CC
|
+-- A1
    |
    +-- B1
```
