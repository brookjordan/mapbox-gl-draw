import { Feature, Point } from "geojson";
import { activeStates, geojsonTypes, meta } from "../constants";

/**
 * Returns GeoJSON for a Point representing the
 * vertex of another feature.
 *
 * @param {string} parentId
 * @param {Array<number>} coordinates
 * @param {string} path - Dot-separated numbers indicating exactly
 *   where the point exists within its parent feature's coordinates.
 * @param {boolean} selected
 * @return {GeoJSON} Point
 */

export default function (
  parentId,
  coordinates,
  path,
  selected
): Feature<Point> {
  return {
    type: geojsonTypes.FEATURE,
    properties: {
      meta: meta.VERTEX,
      parent: parentId,
      coord_path: path,
      active: selected ? activeStates.ACTIVE : activeStates.INACTIVE,
    },
    geometry: {
      type: geojsonTypes.POINT,
      coordinates,
    },
  };
}
