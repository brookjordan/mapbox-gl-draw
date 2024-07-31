import { Map } from "mapbox-gl";
import { Context } from "./api";
import { geojsonTypes, sources } from "./constants";
import Events from "./events";
import Store from "./store";
import Ui from "./ui";

export default function (ctx: Context) {
  let controlContainer: HTMLElement | null = null;
  let mapLoadedInterval: Parameters<typeof clearInterval>[0] = null;

  const setup = {
    onRemove() {
      // Stop connect attempt in the event that control is removed before map is loaded
      ctx.map.off("load", setup.connect);
      clearInterval(mapLoadedInterval);

      setup.removeLayers();
      ctx.store.restoreMapConfig();
      ctx.ui.removeButtons();
      ctx.events.removeEventListeners();
      ctx.ui.clearMapClasses();
      if (ctx.boxZoomInitial) ctx.map.boxZoom.enable();
      ctx.map = null;
      ctx.container = null;
      ctx.store = null;

      if (controlContainer && controlContainer.parentNode) {
        controlContainer.parentNode.removeChild(controlContainer);
      }
      controlContainer = null;

      return this;
    },
    connect() {
      ctx.map.off("load", setup.connect);
      clearInterval(mapLoadedInterval);
      setup.addLayers();
      ctx.store.storeMapConfig();
      ctx.events.addEventListeners();
    },
    onAdd(map: Map) {
      ctx.map = map;
      ctx.events = new Events(ctx);
      ctx.ui = new Ui(ctx);
      ctx.container = map.getContainer();
      ctx.store = new Store(ctx);

      controlContainer = ctx.ui.addButtons();

      if (ctx.options.boxSelect) {
        ctx.boxZoomInitial = map.boxZoom.isEnabled();
        map.boxZoom.disable();
        const dragPanIsEnabled = map.dragPan.isEnabled();
        // Need to toggle dragPan on and off or else first
        // dragPan disable attempt in simple_select doesn't work
        map.dragPan.disable();
        map.dragPan.enable();
        if (!dragPanIsEnabled) {
          map.dragPan.disable();
        }
      }

      if (map.loaded()) {
        setup.connect();
      } else {
        map.on("load", setup.connect);
        mapLoadedInterval = setInterval(() => {
          if (map.loaded()) setup.connect();
        }, 16);
      }

      ctx.events.start();
      return controlContainer;
    },
    addLayers() {
      // drawn features style
      ctx.map.addSource(sources.COLD, {
        data: {
          type: geojsonTypes.FEATURE_COLLECTION,
          features: [],
        },
        type: "geojson",
      });

      // hot features style
      ctx.map.addSource(sources.HOT, {
        data: {
          type: geojsonTypes.FEATURE_COLLECTION,
          features: [],
        },
        type: "geojson",
      });

      ctx.options.styles.forEach((style) => {
        ctx.map.addLayer(style);
      });

      ctx.store.setDirty(true);
      ctx.store.render();
    },
    // Check for layers and sources before attempting to remove
    // If user adds draw control and removes it before the map is loaded, layers and sources will be missing
    removeLayers() {
      ctx.options.styles.forEach((style) => {
        if (ctx.map.getLayer(style.id)) {
          ctx.map.removeLayer(style.id);
        }
      });

      if (ctx.map.getSource(sources.COLD)) {
        ctx.map.removeSource(sources.COLD);
      }

      if (ctx.map.getSource(sources.HOT)) {
        ctx.map.removeSource(sources.HOT);
      }
    },
  };

  ctx.setup = setup;

  return setup;
}
