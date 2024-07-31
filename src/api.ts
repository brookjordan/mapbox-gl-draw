import normalize from "@mapbox/geojson-normalize";
import isEqual from "fast-deep-equal";
import hat from "hat";
import { DrawModeName, geojsonTypes, modes } from "./constants";
import featuresAt from "./lib/features_at";
import StringSet from "./lib/string_set";
import stringSetsAreEqual from "./lib/string_sets_are_equal";

import LineString from "./feature_types/line_string";
import MultiFeature from "./feature_types/multi_feature";
import Polygon from "./feature_types/polygon";
import { Feature, FeatureCollection, GeoJSON } from "geojson";
import Store from "./store";
import Events from "./events";
import { Options } from "./options";
import { Map, Point } from "mapbox-gl";
import Ui from "./ui";

const featureTypes = {
  Polygon,
  LineString,
  Point,
  MultiPolygon: MultiFeature,
  MultiLineString: MultiFeature,
  MultiPoint: MultiFeature,
} as const;

type ModeOptions =
  | {
      featureId?: never;
      featureIds: string[];
    }
  | {
      featureId: string;
      featureIds?: never;
    };

export interface Context {
  container: HTMLElement;
  events: Events;
  store: Store;
  options: Options;
  map: Map | null;
  ui: Ui;
}

export default class API {
  modes;
  ctx: Context;

  getFeatureIdsAt(point: Point) {
    const features = featuresAt.click({ point }, null, this.ctx);
    return features.map((feature) => feature.properties.id);
  }

  getSelectedIds() {
    return this.ctx.store.getSelectedIds();
  }

  getSelected() {
    return {
      type: geojsonTypes.FEATURE_COLLECTION,
      features: this.ctx.store
        .getSelectedIds()
        .map((id) => this.ctx.store.get(id))
        .map((feature) => feature.toGeoJSON()),
    };
  }

  getSelectedPoints() {
    return {
      type: geojsonTypes.FEATURE_COLLECTION,
      features: this.ctx.store.getSelectedCoordinates().map(
        (coordinate): Feature => ({
          type: geojsonTypes.FEATURE,
          properties: {},
          geometry: {
            type: geojsonTypes.POINT,
            coordinates: coordinate.coordinates,
          },
        })
      ),
    };
  }

  set(featureCollection: FeatureCollection) {
    if (
      featureCollection.type === undefined ||
      featureCollection.type !== geojsonTypes.FEATURE_COLLECTION ||
      !Array.isArray(featureCollection.features)
    ) {
      throw new Error("Invalid FeatureCollection");
    }
    const renderBatch = this.ctx.store.createRenderBatch();
    let toDelete = this.ctx.store.getAllIds().slice();
    const newIds = this.add(featureCollection);
    const newIdsLookup = new StringSet(newIds);

    toDelete = toDelete.filter((id) => !newIdsLookup.has(id));
    if (toDelete.length) {
      this.delete(toDelete);
    }

    renderBatch();
    return newIds;
  }

  add(geojson: GeoJSON) {
    const featureCollection: ReturnType<typeof normalize> = JSON.parse(
      JSON.stringify(normalize(geojson))
    );

    const ids = featureCollection.features.map((feature) => {
      feature.id = feature.id || hat();

      if (feature.geometry === null) {
        throw new Error("Invalid geometry: null");
      }

      if (
        this.ctx.store.get(feature.id) === undefined ||
        this.ctx.store.get(feature.id).type !== feature.geometry.type
      ) {
        // If the feature has not yet been created ...
        const Model =
          featureTypes[feature.geometry.type as keyof typeof featureTypes];
        if (Model === undefined) {
          throw new Error(`Invalid geometry type: ${feature.geometry.type}.`);
        }
        const internalFeature = new Model(this.ctx, feature);
        this.ctx.store.add(internalFeature);
      } else {
        // If a feature of that id has already been created, and we are swapping it out ...
        const internalFeature = this.ctx.store.get(feature.id);
        const originalProperties = internalFeature.properties;
        internalFeature.properties = feature.properties;
        if (!isEqual(originalProperties, feature.properties)) {
          this.ctx.store.featureChanged(internalFeature.id);
        }
        if (
          "coordinates" in feature.geometry &&
          !isEqual(
            internalFeature.getCoordinates(),
            feature.geometry.coordinates
          )
        ) {
          internalFeature.incomingCoords(feature.geometry.coordinates);
        }
      }
      return feature.id;
    });

    this.ctx.store.render();
    return ids;
  }

  get(id: string) {
    const feature = this.ctx.store.get(id);
    if (feature) {
      return feature.toGeoJSON();
    }
  }

  getAll() {
    return {
      type: geojsonTypes.FEATURE_COLLECTION,
      features: this.ctx.store.getAll().map((feature) => feature.toGeoJSON()),
    };
  }

  delete(featureIds: string[]) {
    this.ctx.store.delete(featureIds, { silent: true });
    // If we were in direct select mode and our selected feature no longer exists
    // (because it was deleted), we need to get out of that mode.
    if (
      this.getMode() === modes.DIRECT_SELECT &&
      !this.ctx.store.getSelectedIds().length
    ) {
      this.ctx.events.changeMode(modes.SIMPLE_SELECT, undefined, {
        silent: true,
      });
    } else {
      this.ctx.store.render();
    }

    return this;
  }

  deleteAll() {
    this.ctx.store.delete(this.ctx.store.getAllIds(), { silent: true });
    // If we were in direct select mode, now our selected feature no longer exists,
    // so escape that mode.
    if (this.getMode() === modes.DIRECT_SELECT) {
      this.ctx.events.changeMode(modes.SIMPLE_SELECT, undefined, {
        silent: true,
      });
    } else {
      this.ctx.store.render();
    }

    return this;
  }

  changeMode(mode: DrawModeName, modeOptions: Partial<ModeOptions> = {}) {
    // Avoid changing modes just to re-select what's already selected
    if (
      mode === modes.SIMPLE_SELECT &&
      this.getMode() === modes.SIMPLE_SELECT
    ) {
      if (
        stringSetsAreEqual(
          modeOptions.featureIds || [],
          this.ctx.store.getSelectedIds()
        )
      )
        return this;
      // And if we are changing the selection within simple_select mode, just change the selection,
      // instead of stopping and re-starting the mode
      this.ctx.store.setSelected(modeOptions.featureIds, { silent: true });
      this.ctx.store.render();
      return this;
    }

    if (
      mode === modes.DIRECT_SELECT &&
      this.getMode() === modes.DIRECT_SELECT &&
      modeOptions.featureId === this.ctx.store.getSelectedIds()[0]
    ) {
      return this;
    }

    this.ctx.events.changeMode(mode, modeOptions, { silent: true });
    return this;
  }

  getMode() {
    return this.ctx.events.getMode();
  }

  trash() {
    this.ctx.events.trash({ silent: true });
    return this;
  }

  combineFeatures() {
    this.ctx.events.combineFeatures();
    return this;
  }

  uncombineFeatures() {
    this.ctx.events.uncombineFeatures();
    return this;
  }

  setFeatureProperty(
    featureId: string,
    property: string,
    value: string | number
  ) {
    this.ctx.store.setFeatureProperty(featureId, property, value);
    return this;
  }

  constructor(ctx: Context, api: API) {
    this.ctx = ctx;
    this.modes = modes;

    Object.keys(api).forEach((key: keyof API) => {
      if (typeof api[key] !== "function") return;

      this[key] = api[key].bind(this);
    });
  }
}
