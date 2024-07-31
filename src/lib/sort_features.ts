import area from "@mapbox/geojson-area";
import { geojsonTypes } from "../constants";
import { Properties } from "../feature_types/feature";
import { Geometry, Feature } from "geojson";

const FEATURE_SORT_RANKS = {
  Point: 0,
  LineString: 1,
  MultiLineString: 1,
  Polygon: 2,
} as const;

function comparator(
  featureA: Feature<Geometry, Properties>,
  featureB: Feature<Geometry, Properties>
) {
  const featureASortRank =
    featureA.geometry.type in FEATURE_SORT_RANKS
      ? FEATURE_SORT_RANKS[
          featureA.geometry.type as keyof typeof FEATURE_SORT_RANKS
        ]
      : 3;
  const featureBSortRank =
    featureB.geometry.type in FEATURE_SORT_RANKS
      ? FEATURE_SORT_RANKS[
          featureB.geometry.type as keyof typeof FEATURE_SORT_RANKS
        ]
      : 3;
  const score = featureASortRank - featureBSortRank;

  if (score === 0 && featureA.geometry.type === geojsonTypes.POLYGON) {
    return featureA.properties.area - featureB.properties.area;
  }

  return score;
}

/**
 * Sort in the order above, then sort polygons by area ascending.
 */
export default function (features: Feature<Geometry, Properties>[]) {
  return features
    .map((feature) => {
      if (feature.geometry.type === geojsonTypes.POLYGON) {
        feature.properties.area = area.geometry(feature.geometry);
      }
      return feature;
    })
    .sort(comparator)
    .map((feature) => {
      delete feature.properties.area;
      return feature;
    });
}
