import { activeStates, cursors } from "../constants";
import featuresAt from "./features_at";

export default function getFeatureAtAndSetCursors(event, ctx) {
  const features = featuresAt.click(event, null, ctx);
  const classes: {
    mouse: (typeof cursors)[keyof typeof cursors];
    feature?: unknown;
  } = { mouse: cursors.NONE };

  if (features[0]) {
    classes.mouse =
      features[0].properties.active === activeStates.ACTIVE
        ? cursors.MOVE
        : cursors.POINTER;
    classes.feature = features[0].properties.meta;
  }

  if (ctx.events.currentModeName().indexOf("draw") !== -1) {
    classes.mouse = cursors.ADD;
  }

  ctx.ui.queueMapClasses(classes);
  ctx.ui.updateMapClasses();

  return features[0];
}
