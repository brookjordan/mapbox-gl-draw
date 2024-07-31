import runSetup from "./src/setup";
import setupOptions, { Options, SetupOptions } from "./src/options";
import API from "./src/api";
import modes from "./src/modes/index";
import * as Constants from "./src/constants";
import * as lib from "./src/lib/index";

interface Context {
  options: Options;
  api: API;
}

const setupDraw = function (options: SetupOptions, api: API) {
  options = setupOptions(options);

  const ctx: Context = {
    options,
    api: null,
  };

  api = new API(ctx, api);
  ctx.api = api;

  const setup = runSetup(ctx);

  api.onAdd = setup.onAdd;
  api.onRemove = setup.onRemove;
  api.types = types;
  api.options = options;

  return api;
};

function MapboxDraw(options) {
  setupDraw(options, this);
}

MapboxDraw.modes = modes;
MapboxDraw.constants = Constants;
MapboxDraw.lib = lib;

export default MapboxDraw;
