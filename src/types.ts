import Polygon from "./classes/Polygon.ts";
import Vertex from "./classes/Vertex.ts";

export enum Orientation {
  ANTICLOCKWISE,
  COLLINEAR,
  CLOCKWISE,
}

export enum PointLocationType {
  IN_OBSTACLE,
  IN_POLYGON,
  ON_BORDER,
  ON_EDGE,
  ON_AMBIG_CORNER_VERTEX,
  ON_UNAMBIG_CORNER_VERTEX,
  ON_NON_CORNER_VERTEX,
}

export interface PointLocation {
  type: PointLocationType;

  // IN_OBSTACLE: empty
  // IN_POLYGON: the polygon
  // ON_BORDER: the traversable polygon
  // ON_EDGE: the traversable polygons
  // ON_AMBIG_CORNER_VERTEX: the traversable polygons
  // ON_UNAMBIG_CORNER_VERTEX: the traversable polygons
  // ON_NON_CORNER_VERTEX: the traversable polygons
  polygons: Polygon[];

  // IN_OBSTACLE: empty
  // IN_POLYGON: empty
  // ON_BORDER: the r-l vertices of the edge
  // ON_EDGE: the r-l vertices of the edge viewed from inside the first polygon
  // ON_AMBIG_CORNER_VERTEX: the vertex
  // ON_UNAMBIG_CORNER_VERTEX: the vertex
  // ON_NON_CORNER_VERTEX: the vertex
  vertices: Vertex[];
}

export enum PolyContainmentType {
  OUTSIDE,
  INSIDE,
  ON_EDGE,
  ON_VERTEX,
}

export interface PolyContainment {
  type: PolyContainmentType;

  // OUTSIDE: Obstacle
  // INSIDE: Obstacle
  // ON_EDGE: Next polygon passing through the edge
  // ON_VERTEX: Obstacle
  adjPoly: Polygon;

  // OUTSIDE: empty
  // INSIDE: empty
  // ON_EDGE: the vertices of the edge
  // ON_VERTEX: the vertex
  verts: Vertex[];
}
