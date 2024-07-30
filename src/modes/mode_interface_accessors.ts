import { geojsonTypes } from "../constants";
import featuresAt from "../lib/features_at";
import Point from "../feature_types/point";
import LineString from "../feature_types/line_string";
import Polygon from "../feature_types/polygon";
import MultiFeature from "../feature_types/multi_feature";
import {
  Feature as GeoJSONFeature,
  Point as GeoJSONPoint,
  LineString as GeoJSONLineString,
  Polygon as GeoJSONPolygon,
} from "geojson";

type GeometryType =
  | typeof geojsonTypes.POINT
  | typeof geojsonTypes.LINE_STRING
  | typeof geojsonTypes.POLYGON
  | "MultiFeature";

type Feature =
  | GeoJSONFeature<GeoJSONPoint>
  | GeoJSONFeature<GeoJSONLineString>
  | GeoJSONFeature<GeoJSONPolygon>
  | "MultiFeature";

export default class ModeInterfaceAccessors {
  map;
  drawConfig;
  _ctx;

  /**
   * Sets Draw's interal selected state
   * @name this.setSelected
   * @param {DrawFeature[]} - whats selected as a [DrawFeature](https://github.com/mapbox/mapbox-gl-draw/blob/main/src/feature_types/feature)
   */
  setSelected = function (features) {
    return this._ctx.store.setSelected(features);
  };

  /**
   * Sets Draw's internal selected coordinate state
   * @name this.setSelectedCoordinates
   * @param {Object[]} coords - a array of {coord_path: 'string', feature_id: 'string'}
   */
  setSelectedCoordinates = function (coords) {
    this._ctx.store.setSelectedCoordinates(coords);
    coords.reduce((m, c) => {
      if (m[c.feature_id] === undefined) {
        m[c.feature_id] = true;
        this._ctx.store.get(c.feature_id).changed();
      }
      return m;
    }, {});
  };

  /**
   * Get all selected features as a [DrawFeature](https://github.com/mapbox/mapbox-gl-draw/blob/main/src/feature_types/feature)
   * @name this.getSelected
   * @returns {DrawFeature[]}
   */
  getSelected = function () {
    return this._ctx.store.getSelected();
  };

  /**
   * Get the ids of all currently selected features
   * @name this.getSelectedIds
   * @returns {String[]}
   */
  getSelectedIds = function () {
    return this._ctx.store.getSelectedIds();
  };

  /**
   * Check if a feature is selected
   * @name this.isSelected
   * @param {String} id - a feature id
   * @returns {Boolean}
   */
  isSelected = function (id) {
    return this._ctx.store.isSelected(id);
  };

  /**
   * Get a [DrawFeature](https://github.com/mapbox/mapbox-gl-draw/blob/main/src/feature_types/feature) by its id
   * @name this.getFeature
   * @param {String} id - a feature id
   * @returns {DrawFeature}
   */
  getFeature = function (id) {
    return this._ctx.store.get(id);
  };

  /**
   * Add a feature to draw's internal selected state
   * @name this.select
   * @param {String} id
   */
  select = function (id) {
    return this._ctx.store.select(id);
  };

  /**
   * Remove a feature from draw's internal selected state
   * @name this.delete
   * @param {String} id
   */
  deselect = function (id) {
    return this._ctx.store.deselect(id);
  };

  /**
   * Delete a feature from draw
   * @name this.deleteFeature
   * @param {String} id - a feature id
   */
  deleteFeature = function (id, opts = {}) {
    return this._ctx.store.delete(id, opts);
  };

  /**
   * Add a [DrawFeature](https://github.com/mapbox/mapbox-gl-draw/blob/main/src/feature_types/feature) to draw.
   * See `this.newFeature` for converting geojson into a DrawFeature
   * @name this.addFeature
   * @param {DrawFeature} feature - the feature to add
   */
  addFeature = function (feature) {
    return this._ctx.store.add(feature);
  };

  /**
   * Clear all selected features
   */
  clearSelectedFeatures = function () {
    return this._ctx.store.clearSelected();
  };

  /**
   * Clear all selected coordinates
   */
  clearSelectedCoordinates = function () {
    return this._ctx.store.clearSelectedCoordinates();
  };

  /**
   * Indicate if the different action are currently possible with your mode
   * See [draw.actionalbe](https://github.com/mapbox/mapbox-gl-draw/blob/main/API.md#drawactionable) for a list of possible actions. All undefined actions are set to **false** by default
   * @name this.setActionableState
   * @param {Object} actions
   */
  setActionableState = function (
    actions: {
      trash?: boolean;
      combineFeatures?: boolean;
      uncombineFeatures?: boolean;
    } = {}
  ) {
    const newSet = {
      trash: actions.trash || false,
      combineFeatures: actions.combineFeatures || false,
      uncombineFeatures: actions.uncombineFeatures || false,
    };
    return this._ctx.events.actionable(newSet);
  };

  /**
   * Trigger a mode change
   * @name this.changeMode
   * @param {String} mode - the mode to transition into
   * @param {Object} opts - the options object to pass to the new mode
   * @param {Object} eventOpts - used to control what kind of events are emitted.
   */
  changeMode = function (mode, opts = {}, eventOpts = {}) {
    return this._ctx.events.changeMode(mode, opts, eventOpts);
  };

  /**
   * Update the state of draw map classes
   * @name this.updateUIClasses
   * @param {Object} opts
   */
  updateUIClasses = function (opts) {
    return this._ctx.ui.queueMapClasses(opts);
  };

  /**
   * If a name is provided it makes that button active, else if makes all buttons inactive
   * @name this.activateUIButton
   * @param {String?} name - name of the button to make active, leave as undefined to set buttons to be inactive
   */
  activateUIButton = function (name) {
    return this._ctx.ui.setActiveButton(name);
  };

  /**
   * Get the features at the location of an event object or in a bbox
   * @name this.featuresAt
   * @param {Event||NULL} event - a mapbox-gl event object
   * @param {BBOX||NULL} bbox - the area to get features from
   * @param {String} bufferType - is this `click` or `tap` event, defaults to click
   */
  featuresAt = function (event, bbox, bufferType = "click") {
    if (bufferType !== "click" && bufferType !== "touch")
      throw new Error("invalid buffer type");
    return featuresAt[bufferType](event, bbox, this._ctx);
  };

  /**
   * Create a new [DrawFeature](https://github.com/mapbox/mapbox-gl-draw/blob/main/src/feature_types/feature) from geojson
   * @name this.newFeature
   * @param {GeoJSONFeature} geojson
   * @returns {DrawFeature}
   */
  newFeature = function <Geometry extends Feature>(geojson) {
    const type = geojson.geometry.type;
    if (type === geojsonTypes.POINT) return new Point(this._ctx, geojson);
    if (type === geojsonTypes.LINE_STRING)
      return new LineString(this._ctx, geojson);
    if (type === geojsonTypes.POLYGON) return new Polygon(this._ctx, geojson);
    return new MultiFeature(this._ctx, geojson);
  };

  /**
   * Check is an object is an instance of a [DrawFeature](https://github.com/mapbox/mapbox-gl-draw/blob/main/src/feature_types/feature)
   * @name this.isInstanceOf
   * @param {String} type - `Point`, `LineString`, `Polygon`, `MultiFeature`
   * @param {Object} feature - the object that needs to be checked
   * @returns {Boolean}
   */
  isInstanceOf = function (type: GeometryType, feature) {
    if (type === geojsonTypes.POINT) return feature instanceof Point;
    if (type === geojsonTypes.LINE_STRING) return feature instanceof LineString;
    if (type === geojsonTypes.POLYGON) return feature instanceof Polygon;
    if (type === "MultiFeature") return feature instanceof MultiFeature;
    throw new Error(`Unknown feature class: ${type}`);
  };

  /**
   * Force draw to rerender the feature of the provided id
   * @name this.doRender
   * @param {String} id - a feature id
   */
  doRender = function (id: string) {
    return this._ctx.store.featureChanged(id);
  };

  constructor(ctx) {
    this.map = ctx.map;
    this.drawConfig = JSON.parse(JSON.stringify(ctx.options || {}));
    this._ctx = ctx;
  }
}
