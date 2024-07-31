import hat from "hat";
import { activeStates, DrawModeName, geojsonTypes, meta } from "../constants";
import Store from "../store";
import { Options } from "../options";
import {
  Feature as GeoJSONFeature,
  Point as GeoJSONPoint,
  LineString as GeoJSONLineString,
  MultiLineString as GeoJSONMultiLineString,
  Polygon as GeoJSONPolygon,
  GeoJsonProperties,
} from "geojson";
import Polygon from "./polygon";
import LineString from "./line_string";
import Point from "./point";
import MultiFeature from "./multi_feature";

export interface Properties extends GeoJsonProperties {
  area?: number;
}

export type AnyFeature = Point | LineString | Polygon | MultiFeature;

type Geometry =
  | GeoJSONPoint
  | GeoJSONLineString
  | GeoJSONMultiLineString
  | GeoJSONPolygon;

class Feature {
  ctx;
  properties: Properties;
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

  setProperty<Property extends keyof Properties>(
    property: Property,
    value: Properties[Property]
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

  internal(mode: DrawModeName) {
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
    geojson: GeoJSONFeature<Geometry>
  ) {
    this.ctx = ctx;
    this.properties = geojson.properties || {};
    this.coordinates = geojson.geometry.coordinates;
    this.id = geojson.id || hat();
    this.type = geojson.geometry.type;
  }
}

export default Feature;
