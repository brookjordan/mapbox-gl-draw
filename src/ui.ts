import { classes, modes, types } from "./constants";
import { Control } from "./options";

const classTypes = ["mode", "feature", "mouse"];

export default class {
  ctx;

  buttonElements: Partial<{
    [type in Control]: HTMLButtonElement;
  }> = {};
  activeButton = null;

  currentMapClasses = {
    mode: null, // e.g. mode-direct_select
    feature: null, // e.g. feature-vertex
    mouse: null, // e.g. mouse-move
  };

  nextMapClasses = {
    mode: null,
    feature: null,
    mouse: null,
  };

  clearMapClasses() {
    this.queueMapClasses({ mode: null, feature: null, mouse: null });
    this.updateMapClasses();
  }

  queueMapClasses(options) {
    this.nextMapClasses = Object.assign(this.nextMapClasses, options);
  }

  updateMapClasses() {
    if (!this.ctx.container) return;

    const classesToRemove = [];
    const classesToAdd = [];

    classTypes.forEach((type) => {
      if (this.nextMapClasses[type] === this.currentMapClasses[type]) return;

      classesToRemove.push(`${type}-${this.currentMapClasses[type]}`);
      if (this.nextMapClasses[type] !== null) {
        classesToAdd.push(`${type}-${this.nextMapClasses[type]}`);
      }
    });

    if (classesToRemove.length > 0) {
      this.ctx.container.classList.remove(...classesToRemove);
    }

    if (classesToAdd.length > 0) {
      this.ctx.container.classList.add(...classesToAdd);
    }

    this.currentMapClasses = Object.assign(
      this.currentMapClasses,
      this.nextMapClasses
    );
  }

  createControlButton(
    id,
    options: {
      container?: any;
      className?: string;
      title?: string;
      onDeactivate?: () => void;
      onActivate?: () => void;
    } = {}
  ) {
    const button = document.createElement("button");
    button.className = `${classes.CONTROL_BUTTON} ${options.className}`;
    button.setAttribute("title", options.title);
    options.container.appendChild(button);

    button.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        const clickedButton = e.target;
        if (clickedButton === this.activeButton) {
          this.deactivateButtons();
          options.onDeactivate?.();
          return;
        }

        this.setActiveButton(id);
        options.onActivate?.();
      },
      true
    );

    return button;
  }

  deactivateButtons() {
    if (!this.activeButton) return;
    this.activeButton.classList.remove(classes.ACTIVE_BUTTON);
    this.activeButton = null;
  }

  setActiveButton(id) {
    this.deactivateButtons();

    const button = this.buttonElements[id];
    if (!button) return;

    if (button && id !== "trash") {
      button.classList.add(classes.ACTIVE_BUTTON);
      this.activeButton = button;
    }
  }

  addButtons() {
    const controls = this.ctx.options.controls;
    const controlGroup = document.createElement("div");
    controlGroup.className = `${classes.CONTROL_GROUP} ${classes.CONTROL_BASE}`;

    if (!controls) return controlGroup;

    if (controls[types.LINE]) {
      this.buttonElements[types.LINE] = this.createControlButton(types.LINE, {
        container: controlGroup,
        className: classes.CONTROL_BUTTON_LINE,
        title: `LineString tool ${this.ctx.options.keybindings ? "(l)" : ""}`,
        onActivate: () => this.ctx.events.changeMode(modes.DRAW_LINE_STRING),
        onDeactivate: () => this.ctx.events.trash(),
      });
    }

    if (controls[types.POLYGON]) {
      this.buttonElements[types.POLYGON] = this.createControlButton(
        types.POLYGON,
        {
          container: controlGroup,
          className: classes.CONTROL_BUTTON_POLYGON,
          title: `Polygon tool ${this.ctx.options.keybindings ? "(p)" : ""}`,
          onActivate: () => this.ctx.events.changeMode(modes.DRAW_POLYGON),
          onDeactivate: () => this.ctx.events.trash(),
        }
      );
    }

    if (controls[types.POINT]) {
      this.buttonElements[types.POINT] = this.createControlButton(types.POINT, {
        container: controlGroup,
        className: classes.CONTROL_BUTTON_POINT,
        title: `Marker tool ${this.ctx.options.keybindings ? "(m)" : ""}`,
        onActivate: () => this.ctx.events.changeMode(modes.DRAW_POINT),
        onDeactivate: () => this.ctx.events.trash(),
      });
    }

    if (controls.trash) {
      this.buttonElements.trash = this.createControlButton("trash", {
        container: controlGroup,
        className: classes.CONTROL_BUTTON_TRASH,
        title: "Delete",
        onActivate: () => {
          this.ctx.events.trash();
        },
      });
    }

    if (controls.combine_features) {
      this.buttonElements.combine_features = this.createControlButton(
        "combineFeatures",
        {
          container: controlGroup,
          className: classes.CONTROL_BUTTON_COMBINE_FEATURES,
          title: "Combine",
          onActivate: () => {
            this.ctx.events.combineFeatures();
          },
        }
      );
    }

    if (controls.uncombine_features) {
      this.buttonElements.uncombine_features = this.createControlButton(
        "uncombineFeatures",
        {
          container: controlGroup,
          className: classes.CONTROL_BUTTON_UNCOMBINE_FEATURES,
          title: "Uncombine",
          onActivate: () => {
            this.ctx.events.uncombineFeatures();
          },
        }
      );
    }

    return controlGroup;
  }

  removeButtons() {
    Object.keys(this.buttonElements).forEach((buttonId) => {
      const button = this.buttonElements[buttonId];
      if (button.parentNode) {
        button.parentNode.removeChild(button);
      }
      delete this.buttonElements[buttonId];
    });
  }

  constructor(ctx) {
    this.ctx = ctx;
  }
}
