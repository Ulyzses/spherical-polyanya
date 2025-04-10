export type PolygonIndex = number;
export type VertexIndex = number;

export enum PointLocationType {
  // The point is in an obstacle polygon
  IN_OBSTACLE,

  // The point is entirely in one polygon
  IN_POLYGON,

  // The point is on the edge of a traversable polygon and an obstacle
  ON_MESH_BORDER,

  // The point is on the edge of two traversable polygons
  ON_EDGE,

  // The point is on a vertex that is adjacent to multiple obstacles
  ON_AMBIG_CORNER_VERTEX,

  // The point is on a vertex that is adjacent to one obstacle
  ON_UNAMBIG_CORNER_VERTEX,

  // The point is on a vertex that is adjacent to all traversable polygons
  ON_NON_CORNER_VERTEX,
}

export interface PointLocation {
  type: PointLocationType;

  // IN_OBSTACLE: empty
  // IN_POLYGON: the polygon index
  // ON_MESH_BORDER: the traversable polygon index
  // ON_EDGE: the traversable polygon indices
  // ON_AMBIG_CORNER_VERTEX: the traversable polygon indices
  // ON_UNAMBIG_CORNER_VERTEX: the traversable polygon indices
  // ON_NON_CORNER_VERTEX: the traversable polygon indices
  polygons: PolygonIndex[];

  // IN_OBSTACLE: empty
  // IN_POLYGON: empty
  // ON_MESH_BORDER: the r-l vertices of the edge
  // ON_EDGE: the r-l vertices of the edge from the first polygon
  // ON_AMBIG_CORNER_VERTEX: the vertex index
  // ON_UNAMBIG_CORNER_VERTEX: the vertex index
  // ON_NON_CORNER_VERTEX: the vertex index
  vertices: VertexIndex[];
}

export enum PolyContainmentType {
  OUTSIDE,
  INSIDE,
  ON_EDGE,
  ON_VERTEX,
}

export interface PolyContainment {
  type: PolyContainmentType;

  // OUTSIDE: -1
  // INSIDE: -1
  // ON_EDGE: The next polygon passing by the edge
  // ON_VERTEX: -1
  adjPoly: PolygonIndex;

  // OUTSIDE: empty
  // INSIDE: empty
  // ON_EDGE: the vertices of the edge
  // ON_VERTEX: the vertex index
  verts: VertexIndex[];
}
