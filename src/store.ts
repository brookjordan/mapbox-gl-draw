import { events, geojsonTypes, interactions, sources } from "./constants";
import StringSet from "./lib/string_set";
import toDenseArray from "./lib/to_dense_array";

export default class Store {
  _features = {};
  _featureIds = new StringSet();
  _selectedFeatureIds = new StringSet();
  _selectedCoordinates = [];
  _changedFeatureIds = new StringSet();
  _deletedFeaturesToEmit = [];
  _emitSelectionChange = false;
  _mapInitialConfig = {};
  ctx: {
    events;
    map;
    ui;
  };
  isDirty = false;
  sources = {
    hot: [],
    cold: [],
  };

  // Deduplicate requests to render and tie them to animation frames.
  renderRequest;
  render() {
    if (!this.renderRequest) {
      this.renderRequest = requestAnimationFrame(() => {
        this.renderRequest = null;
        this._render();
      });
    }
  }

  /**
   * Delays all rendering until the returned function is invoked
   * @return {Function} renderBatch
   */
  createRenderBatch() {
    const holdRender = this.render;
    let numRenders = 0;
    this.render = function () {
      numRenders++;
    };

    return () => {
      this.render = holdRender;
      if (numRenders > 0) {
        this.render();
      }
    };
  }

  /**
   * Sets the store's state to dirty.
   * @return {Store} this
   */
  setDirty() {
    this.isDirty = true;
    return this;
  }

  /**
   * Sets a feature's state to changed.
   * @param {string} featureId
   * @return {Store} this
   */
  featureChanged(featureId) {
    this._changedFeatureIds.add(featureId);
    return this;
  }

  /**
   * Gets the ids of all features currently in changed state.
   * @return {Store} this
   */
  getChangedIds() {
    return this._changedFeatureIds.values();
  }

  /**
   * Sets all features to unchanged state.
   * @return {Store} this
   */
  clearChangedIds() {
    this._changedFeatureIds.clear();
    return this;
  }

  /**
   * Gets the ids of all features in the store.
   * @return {Store} this
   */
  getAllIds() {
    return this._featureIds.values();
  }

  /**
   * Adds a feature to the store.
   * @param {Object} feature
   *
   * @return {Store} this
   */
  add(feature) {
    this.featureChanged(feature.id);
    this._features[feature.id] = feature;
    this._featureIds.add(feature.id);
    return this;
  }

  /**
   * Deletes a feature or array of features from the store.
   * Cleans up after the deletion by deselecting the features.
   * If changes were made, sets the state to the dirty
   * and fires an event.
   * @param {string | Array<string>} featureIds
   * @param {Object} [options]
   * @param {Object} [options.silent] - If `true`, this invocation will not fire an event.
   * @return {Store} this
   */
  delete(featureIds, options: { silent?: boolean } = {}) {
    toDenseArray(featureIds).forEach((id) => {
      if (!this._featureIds.has(id)) return;
      this._featureIds.delete(id);
      this._selectedFeatureIds.delete(id);
      if (!options.silent) {
        if (this._deletedFeaturesToEmit.indexOf(this._features[id]) === -1) {
          this._deletedFeaturesToEmit.push(this._features[id]);
        }
      }
      delete this._features[id];
      this.isDirty = true;
    });
    this.refreshSelectedCoordinates(options);
    return this;
  }

  /**
   * Returns a feature in the store matching the specified value.
   * @return {Object | undefined} feature
   */
  get(id) {
    return this._features[id];
  }

  /**
   * Returns all features in the store.
   * @return {Array<Object>}
   */
  getAll() {
    return Object.keys(this._features).map((id) => this._features[id]);
  }

  /**
   * Adds features to the current selection.
   * @param {string | Array<string>} featureIds
   * @param {Object} [options]
   * @param {Object} [options.silent] - If `true`, this invocation will not fire an event.
   * @return {Store} this
   */
  select(featureIds, options: { silent?: boolean } = {}) {
    toDenseArray(featureIds).forEach((id) => {
      if (this._selectedFeatureIds.has(id)) return;
      this._selectedFeatureIds.add(id);
      this._changedFeatureIds.add(id);
      if (!options.silent) {
        this._emitSelectionChange = true;
      }
    });
    return this;
  }

  /**
   * Deletes features from the current selection.
   * @param {string | Array<string>} featureIds
   * @param {Object} [options]
   * @param {Object} [options.silent] - If `true`, this invocation will not fire an event.
   * @return {Store} this
   */
  deselect(featureIds, options: { silent?: boolean } = {}) {
    toDenseArray(featureIds).forEach((id) => {
      if (!this._selectedFeatureIds.has(id)) return;
      this._selectedFeatureIds.delete(id);
      this._changedFeatureIds.add(id);
      if (!options.silent) {
        this._emitSelectionChange = true;
      }
    });
    this.refreshSelectedCoordinates(options);
    return this;
  }

  /**
   * Clears the current selection.
   * @param {Object} [options]
   * @param {Object} [options.silent] - If `true`, this invocation will not fire an event.
   * @return {Store} this
   */
  clearSelected(options: { silent?: boolean } = {}) {
    this.deselect(this._selectedFeatureIds.values(), {
      silent: options.silent,
    });
    return this;
  }

  /**
   * Sets the store's selection, clearing any prior values.
   * If no feature ids are passed, the store is just cleared.
   * @param {string | Array<string> | undefined} featureIds
   * @param {Object} [options]
   * @param {Object} [options.silent] - If `true`, this invocation will not fire an event.
   * @return {Store} this
   */
  setSelected(featureIds: string[], options: { silent?: boolean } = {}) {
    featureIds = toDenseArray(featureIds);

    // Deselect any features not in the new selection
    this.deselect(
      this._selectedFeatureIds
        .values()
        .filter((id) => featureIds.indexOf(id) === -1),
      { silent: options.silent }
    );

    // Select any features in the new selection that were not already selected
    this.select(
      featureIds.filter((id) => !this._selectedFeatureIds.has(id)),
      { silent: options.silent }
    );

    return this;
  }

  /**
   * Sets the store's coordinates selection, clearing any prior values.
   * @param {Array<Array<string>>} coordinates
   * @return {Store} this
   */
  setSelectedCoordinates(coordinates) {
    this._selectedCoordinates = coordinates;
    this._emitSelectionChange = true;
    return this;
  }

  /**
   * Clears the current coordinates selection.
   * @param {Object} [options]
   * @return {Store} this
   */
  clearSelectedCoordinates() {
    this._selectedCoordinates = [];
    this._emitSelectionChange = true;
    return this;
  }

  /**
   * Returns the ids of features in the current selection.
   * @return {Array<string>} Selected feature ids.
   */
  getSelectedIds() {
    return this._selectedFeatureIds.values();
  }

  /**
   * Returns features in the current selection.
   * @return {Array<Object>} Selected features.
   */
  getSelected() {
    return this._selectedFeatureIds.values().map((id) => this.get(id));
  }

  /**
   * Returns selected coordinates in the currently selected feature.
   * @return {Array<Object>} Selected coordinates.
   */
  getSelectedCoordinates() {
    const selected = this._selectedCoordinates.map((coordinate) => {
      const feature = this.get(coordinate.feature_id);
      return {
        coordinates: feature.getCoordinate(coordinate.coord_path),
      };
    });
    return selected;
  }

  /**
   * Indicates whether a feature is selected.
   * @param {string} featureId
   * @return {boolean} `true` if the feature is selected, `false` if not.
   */
  isSelected(featureId) {
    return this._selectedFeatureIds.has(featureId);
  }

  /**
   * Sets a property on the given feature
   * @param {string} featureId
   * @param {string} property property
   * @param {string} property value
   */
  setFeatureProperty(featureId, property, value) {
    this.get(featureId).setProperty(property, value);
    this.featureChanged(featureId);
  }

  refreshSelectedCoordinates(options: { silent?: boolean } = {}) {
    const newSelectedCoordinates = this._selectedCoordinates.filter((point) =>
      this._selectedFeatureIds.has(point.feature_id)
    );
    if (
      this._selectedCoordinates.length !== newSelectedCoordinates.length &&
      !options.silent
    ) {
      this._emitSelectionChange = true;
    }
    this._selectedCoordinates = newSelectedCoordinates;
  }

  /**
   * Stores the initial config for a map, so that we can set it again after we're done.
   */
  storeMapConfig() {
    interactions.forEach((interaction) => {
      const interactionSet = this.ctx.map[interaction];
      if (interactionSet) {
        this._mapInitialConfig[interaction] =
          this.ctx.map[interaction].isEnabled();
      }
    });
  }

  /**
   * Restores the initial config for a map, ensuring all is well.
   */
  restoreMapConfig() {
    Object.keys(this._mapInitialConfig).forEach((key) => {
      const value = this._mapInitialConfig[key];
      if (value) {
        this.ctx.map[key].enable();
      } else {
        this.ctx.map[key].disable();
      }
    });
  }

  /**
   * Returns the initial state of an interaction setting.
   * @param {string} interaction
   * @return {boolean} `true` if the interaction is enabled, `false` if not.
   * Defaults to `true`. (Todo: include defaults.)
   */
  getInitialConfigValue(interaction) {
    if (this._mapInitialConfig[interaction] !== undefined) {
      return this._mapInitialConfig[interaction];
    } else {
      // This needs to be set to whatever the default is for that interaction
      // It seems to be true for all cases currently, so let's send back `true`.
      return true;
    }
  }

  _render() {
    const store = this;
    const mapExists =
      store.ctx.map && store.ctx.map.getSource(sources.HOT) !== undefined;
    if (!mapExists) return cleanup();

    const mode = store.ctx.events.currentModeName();

    store.ctx.ui.queueMapClasses({ mode });

    let newHotIds = [];
    let newColdIds = [];

    if (store.isDirty) {
      newColdIds = store.getAllIds();
    } else {
      newHotIds = store
        .getChangedIds()
        .filter((id) => store.get(id) !== undefined);
      newColdIds = store.sources.hot
        .filter(
          (geojson) =>
            geojson.properties.id &&
            newHotIds.indexOf(geojson.properties.id) === -1 &&
            store.get(geojson.properties.id) !== undefined
        )
        .map((geojson) => geojson.properties.id);
    }

    store.sources.hot = [];
    const lastColdCount = store.sources.cold.length;
    store.sources.cold = store.isDirty
      ? []
      : store.sources.cold.filter((geojson) => {
          const id = geojson.properties.id || geojson.properties.parent;
          return newHotIds.indexOf(id) === -1;
        });

    const coldChanged =
      lastColdCount !== store.sources.cold.length || newColdIds.length > 0;
    newHotIds.forEach((id) => renderFeature(id, "hot"));
    newColdIds.forEach((id) => renderFeature(id, "cold"));

    function renderFeature(id, source) {
      const feature = store.get(id);
      const featureInternal = feature.internal(mode);
      store.ctx.events.currentModeRender(featureInternal, (geojson) => {
        geojson.properties.mode = mode;
        store.sources[source].push(geojson);
      });
    }

    if (coldChanged) {
      store.ctx.map.getSource(sources.COLD).setData({
        type: geojsonTypes.FEATURE_COLLECTION,
        features: store.sources.cold,
      });
    }

    store.ctx.map.getSource(sources.HOT).setData({
      type: geojsonTypes.FEATURE_COLLECTION,
      features: store.sources.hot,
    });

    if (store._emitSelectionChange) {
      store.ctx.map.fire(events.SELECTION_CHANGE, {
        features: store.getSelected().map((feature) => feature.toGeoJSON()),
        points: store.getSelectedCoordinates().map((coordinate) => ({
          type: geojsonTypes.FEATURE,
          properties: {},
          geometry: {
            type: geojsonTypes.POINT,
            coordinates: coordinate.coordinates,
          },
        })),
      });
      store._emitSelectionChange = false;
    }

    if (store._deletedFeaturesToEmit.length) {
      const geojsonToEmit = store._deletedFeaturesToEmit.map((feature) =>
        feature.toGeoJSON()
      );

      store._deletedFeaturesToEmit = [];

      store.ctx.map.fire(events.DELETE, {
        features: geojsonToEmit,
      });
    }

    cleanup();
    store.ctx.map.fire(events.RENDER, {});

    function cleanup() {
      store.isDirty = false;
      store.clearChangedIds();
    }
  }

  constructor(ctx) {
    this.ctx = ctx;
  }
}
