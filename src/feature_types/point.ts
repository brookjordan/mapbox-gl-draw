import { Feature as GeoJSONFeature, Point as GeoJSONPoint } from "geojson";
import { Context } from "../api";
import Feature from "./feature";

class Point extends Feature {
  isValid() {
    return (
      typeof this.coordinates[0] === "number" &&
      typeof this.coordinates[1] === "number"
    );
  }

  updateCoordinate(
    ...[pathOrLng, lngOrLat, lat]: [string, number, number] | [number, number]
  ) {
    if (typeof pathOrLng === "string") {
      this.coordinates = [lngOrLat, lat];
    } else {
      this.coordinates = [pathOrLng, lngOrLat];
    }
    this.changed();
  }

  getCoordinate() {
    return this.getCoordinates();
  }

  constructor(ctx: Context, geojson: GeoJSONFeature<GeoJSONPoint>) {
    super(ctx, geojson);
  }
}

export default Point;
