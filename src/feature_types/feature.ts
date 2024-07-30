import hat from "hat";
import { activeStates, DrawMode, geojsonTypes, meta } from "../constants";
import Store from "../store";
import { Options } from "../options";
import {
  Feature as GeoJSONFeature,
  Point as GeoJSONPoint,
  LineString as GeoJSONLineString,
  Polygon as GeoJSONPolygon,
} from "geojson";

class Feature {
  ctx;
  properties;
  coordinates;
  id;
  type;

  updateCoordinate(...args: unknown[]) {}

  changed() {
    this.ctx.store.featureChanged(this.id);
  }

  incomingCoords(coords: number[] | number[][] | number[][][]) {
    this.setCoordinates(coords);
  }

  setCoordinates(coords: number[] | number[][] | number[][][]) {
    this.coordinates = coords;
    this.changed();
  }

  getCoordinates() {
    return JSON.parse(JSON.stringify(this.coordinates));
  }

  setProperty(
    property: keyof GeoJSONFeature["properties"],
    value: GeoJSONFeature["properties"][keyof GeoJSONFeature["properties"]]
  ) {
    this.properties[property] = value;
  }

  toGeoJSON() {
    return JSON.parse(
      JSON.stringify({
        id: this.id,
        type: geojsonTypes.FEATURE,
        properties: this.properties,
        geometry: {
          coordinates: this.getCoordinates(),
          type: this.type,
        },
      })
    );
  }

  internal(mode: DrawMode) {
    const properties: GeoJSONFeature["properties"] = {
      id: this.id,
      meta: meta.FEATURE,
      "meta:type": this.type,
      active: activeStates.INACTIVE,
      mode,
    };

    if (this.ctx.options.userProperties) {
      for (const name in this.properties) {
        properties[`user_${name}`] = this.properties[name];
      }
    }

    return {
      type: geojsonTypes.FEATURE,
      properties,
      geometry: {
        coordinates: this.getCoordinates(),
        type: this.type,
      },
    };
  }

  constructor(
    ctx: { store: Store; options: Options },
    geojson: GeoJSONFeature<GeoJSONPoint | GeoJSONLineString | GeoJSONPolygon>
  ) {
    this.ctx = ctx;
    this.properties = geojson.properties || {};
    this.coordinates = geojson.geometry.coordinates;
    this.id = geojson.id || hat();
    this.type = geojson.geometry.type;
  }
}

export default Feature;
