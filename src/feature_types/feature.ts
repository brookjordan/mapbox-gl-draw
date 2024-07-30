import hat from "hat";
import { activeStates, geojsonTypes, meta } from "../constants";

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

  incomingCoords(coords) {
    this.setCoordinates(coords);
  }

  setCoordinates(coords) {
    this.coordinates = coords;
    this.changed();
  }

  getCoordinates() {
    return JSON.parse(JSON.stringify(this.coordinates));
  }

  setProperty(property, value) {
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

  internal(mode) {
    const properties = {
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

  constructor(ctx, geojson) {
    this.ctx = ctx;
    this.properties = geojson.properties || {};
    this.coordinates = geojson.geometry.coordinates;
    this.id = geojson.id || hat();
    this.type = geojson.geometry.type;
  }
}

export default Feature;
