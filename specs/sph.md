# Spherical Meshes

Spherical meshes are roughly based on the navigation mesh format version 2
defined by in
[Daniel Harabor's Pathfinding Repository](https://bitbucket.org/dharabor/pathfinding/src/master/anyangle/polyanya/utils/spec/mesh/2.txt).

## Format

The first line is "sph", the header. The second line contains two integers: `V`
and `P`.

- `V` is the number of vertices in the mesh.
- `P` is the number of polygons in the mesh. Then follows the vertex section of
  the file, containing `V` lines. Then follows the polygon section of the file,
  containing `P` lines.

### Vertices

A vertex is defined by:

- `lat`: number from [-90, 90].

  Note that `-90` refers to the south pole while `90` refers to the north pole.

- `lon`: number from [-180, 180].

  Note that `-180` refers to the same longitude as `180` (i.e. it wraps around).

- `n`: integer.

  How many vertices the vertex is connected to. This is equivalent to the number
  of edges and polygons the vertex is neighbouring.

- `p`: array of indices of size `n`.

  The (0-indexed) neighbouring polygons from the polygon section. Ordered in
  anticlockwise order with an arbitrary start. If the polygon is not defined
  (i.e. it is an obstacle), a value of `-1` is used. Any two "adjacent"
  obstacles should be merged into one.

### Polygons

A polygon is defined by:

- `n`: integer.

  How many vertices the polygon has

- `v`: array of indices size `n`.

  The (0-indexed) vertices of the polygon from the vertex section. Should be
  sorted such that iterating through `v` goes through the vertices in
  anticlockwise order. The start of the array is arbitrary.

- `p`: array of indices size `p`.

  The (0-indexed) neighbouring polygons from the polygon section. Should be
  ordered such that for each polygon `p[i]`, `p[i]` and this polygon share the
  edge between `v[i]` and `v[i-1]`, wrapping around for the first polygon. If
  the polygon is not defined (i.e. it is an obstacle), a value of `-1` is used.
