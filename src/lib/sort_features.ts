import area from "@mapbox/geojson-area";
import { geojsonTypes } from "../constants";

const FEATURE_SORT_RANKS = {
  Point: 0,
  LineString: 1,
  MultiLineString: 1,
  Polygon: 2,
};

function comparator(a, b) {
  const score =
    FEATURE_SORT_RANKS[a.geometry.type] - FEATURE_SORT_RANKS[b.geometry.type];

  if (score === 0 && a.geometry.type === geojsonTypes.POLYGON) {
    return a.area - b.area;
  }

  return score;
}

/**
 * Sort in the order above, then sort polygons by area ascending.
 */
export default function (features) {
  return features
    .map((feature) => {
      if (feature.geometry.type === geojsonTypes.POLYGON) {
        feature.area = area.geometry({
          type: geojsonTypes.FEATURE,
          property: {},
          geometry: feature.geometry,
        });
      }
      return feature;
    })
    .sort(comparator)
    .map((feature) => {
      delete feature.area;
      return feature;
    });
}
