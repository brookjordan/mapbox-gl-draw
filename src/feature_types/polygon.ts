import { Feature as GeoJSONFeature, Polygon as GeoJSONPolygon } from "geojson";
import { Context } from "../api";
import Feature from "./feature";

type Coords = GeoJSONPolygon["coordinates"];

class Polygon extends Feature {
  isValid(): this is { coordinates: number[][][] } {
    if (this.coordinates.length === 0) return false;
    return this.coordinates.every(
      (ring) => Array.isArray(ring) && ring.length > 2
    );
  }

  /**
   * Expects valid geoJSON polygon geometry: first and last positions must be equivalent.
   */
  incomingCoords(coords: Coords) {
    this.coordinates = coords.map((ring) => ring.slice(0, -1));
    this.changed();
  }

  /**
   * Does NOT expect valid geoJSON polygon geometry: first and last positions should NOT be equivalent.
   */
  setCoordinates(coords: Coords) {
    this.coordinates = coords;
    this.changed();
  }

  addCoordinate(path: string, lng: number, lat: number) {
    if (!this.isValid()) return;

    this.changed();
    const ids = path.split(".").map((x) => parseInt(x, 10));

    const ring = this.coordinates[ids[0]];

    ring.splice(ids[1], 0, [lng, lat]);
  }

  removeCoordinate(path: string) {
    if (!this.isValid()) return;

    this.changed();
    const ids = path.split(".").map((x) => parseInt(x, 10));
    const ring = this.coordinates[ids[0]];
    if (ring) {
      ring.splice(ids[1], 1);
      if (ring.length < 3) {
        this.coordinates.splice(ids[0], 1);
      }
    }
  }

  getCoordinate(path: string) {
    if (!this.isValid()) return;

    const ids = path.split(".").map((x) => parseInt(x, 10));
    const ring = this.coordinates[ids[0]];
    return JSON.parse(JSON.stringify(ring[ids[1]]));
  }

  getCoordinates() {
    if (!this.isValid()) return;

    return this.coordinates.map((coords) => coords.concat([coords[0]]));
  }

  updateCoordinate(path: string, lng: number, lat: number) {
    if (!this.isValid()) return;

    this.changed();
    const parts = path.split(".");
    const ringId = parseInt(parts[0], 10);
    const coordId = parseInt(parts[1], 10);

    if (this.coordinates[ringId] === undefined) {
      this.coordinates[ringId] = [];
    }

    this.coordinates[ringId][coordId] = [lng, lat];
  }

  constructor(ctx: Context, geojson: GeoJSONFeature<GeoJSONPolygon>) {
    super(ctx, geojson);

    if (!this.isValid()) return;
    this.coordinates = this.coordinates.map((ring) => ring.slice(0, -1));
  }
}

export default Polygon;
