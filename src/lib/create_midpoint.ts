import { Feature, Point } from "geojson";
import {
  geojsonTypes,
  LAT_RENDERED_MAX,
  LAT_RENDERED_MIN,
  meta,
} from "../constants";

export default function (parent, startVertex, endVertex): Feature<Point> {
  const startCoord = startVertex.geometry.coordinates;
  const endCoord = endVertex.geometry.coordinates;

  // If a coordinate exceeds the projection, we can't calculate a midpoint,
  // so run away
  if (
    startCoord[1] > LAT_RENDERED_MAX ||
    startCoord[1] < LAT_RENDERED_MIN ||
    endCoord[1] > LAT_RENDERED_MAX ||
    endCoord[1] < LAT_RENDERED_MIN
  ) {
    return null;
  }

  const mid = {
    lng: (startCoord[0] + endCoord[0]) / 2,
    lat: (startCoord[1] + endCoord[1]) / 2,
  };

  return {
    type: geojsonTypes.FEATURE,
    properties: {
      meta: meta.MIDPOINT,
      parent,
      lng: mid.lng,
      lat: mid.lat,
      coord_path: endVertex.properties.coord_path,
    },
    geometry: {
      type: geojsonTypes.POINT,
      coordinates: [mid.lng, mid.lat],
    },
  };
}
