import { geojsonTypes } from "../constants";
import constrainFeatureMovement from "./constrain_feature_movement";

export default function (features, delta) {
  const constrainedDelta = constrainFeatureMovement(
    features.map((feature) => feature.toGeoJSON()),
    delta
  );

  features.forEach((feature) => {
    const currentCoordinates = feature.getCoordinates();

    const moveCoordinate = (coord) => {
      const point = {
        lng: coord[0] + constrainedDelta.lng,
        lat: coord[1] + constrainedDelta.lat,
      };
      return [point.lng, point.lat];
    };
    const moveRing = (ring) => ring.map((coord) => moveCoordinate(coord));
    const moveMultiPolygon = (multi) => multi.map((ring) => moveRing(ring));

    let nextCoordinates;
    if (feature.type === geojsonTypes.POINT) {
      nextCoordinates = moveCoordinate(currentCoordinates);
    } else if (
      feature.type === geojsonTypes.LINE_STRING ||
      feature.type === geojsonTypes.MULTI_POINT
    ) {
      nextCoordinates = currentCoordinates.map(moveCoordinate);
    } else if (
      feature.type === geojsonTypes.POLYGON ||
      feature.type === geojsonTypes.MULTI_LINE_STRING
    ) {
      nextCoordinates = currentCoordinates.map(moveRing);
    } else if (feature.type === geojsonTypes.MULTI_POLYGON) {
      nextCoordinates = currentCoordinates.map(moveMultiPolygon);
    }

    feature.incomingCoords(nextCoordinates);
  });
}
