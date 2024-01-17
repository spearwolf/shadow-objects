parents (context) by shadow-type
================================

### the following tree is given

```
CC
|
+-- A1
    |
    +-- B1
        |
        +-- A2
            |
            +-- B2
                |
                +-- A3
                |
                +-- A4
                |   |
                |   +-- B3
                |
                +-- B4
```

- `A2.getParentByType(A)` &rarr; `A1`
- `A2.getParentByType(B)` &rarr; `B1`
- `B3.getParentByType(B)` &rarr; `A4`
- `B4.getParentByType(A)` &rarr; `A2`


### A context tree

```
A1
|
+-- A2
    |
    +-- A3
    |
    +-- A4
```

### B context tree

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

### parents-by-context for A2

| type | element |
|------|---------|
| A    | A1      |
| B    | B1      |
| CC   | CC      |

### who calls whom

- the browser calls `disconnectedCallback()` for all descendants:
  - A2, B2, A3, A4, B3, B4
- within `disconnectedCallback()` the element must disconnect from all parents-by-type:
  - the `onChildRemoved()` is called for each parent

### how the tree looks afterwards

```
CC
|
+-- A1
    |
    +-- B1
```
