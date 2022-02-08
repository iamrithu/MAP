require([
  "esri/config",
  "esri/widgets/Sketch/SketchViewModel",
  "esri/widgets/support/SnappingControls",
  "esri/Map",
  "esri/layers/GraphicsLayer",
  "esri/views/MapView",
  "esri/widgets/Expand",
  "esri/widgets/Search",
  "esri/widgets/Track",
  "esri/widgets/BasemapGallery",
  "esri/widgets/CoordinateConversion",
  "esri/rest/locator",
  "esri/widgets/ScaleBar",
  "esri/Graphic",
  "esri/geometry/geometryEngine",
], (
  esriConfig,
  SketchViewModel,
  SnappingControls,
  Map,
  GraphicsLayer,
  MapView,
  Expand,
  Search,
  Track,
  BasemapGallery,
  CoordinateConversion,
  locator,
  ScaleBar,
  Graphic,
  geometryEngine
) => {
  esriConfig.apiKey =
    "AAPK98c50a3510cc4cb9a07dc3116113843cqZssDSqHkgmBfOp_v5GIAETd4ggp7oleJJQPSyr9NmmTf-2GSs7swp9zS6T42ny7";

  const graphicsLayer = new GraphicsLayer({ title: "graphicsLayer" });

  const map = new Map({
    basemap: "arcgis-imagery",
    layers: [graphicsLayer],
  });

  map.add(graphicsLayer);

  const view = new MapView({
    container: "viewDiv",
    map: map,
    zoom: 3,
    center: [-110, 68],
  });

  //--------------------------------------
  //find address (search option)
  const searchWidget = new Search({
    view: view,
  });

  const searchExpand = new Expand({
    view: view,
    content: searchWidget,
    expanded: false,
    expandIconClass: "esri-icon-search",
    expandTooltip: "Search",
  });

  // Add the search widget to the top right corner of the view
  view.ui.add(searchExpand, {
    position: "top-right",
  });
  //-------------------LocationTracker-------------------------
  var track = new Track({
    view: view,
  });

  view.ui.add(track, "top-left");

  view.when(function () {
    track.stop();
  });
  //-------------------------BasemapGaller---------------------
  const basemapGallery = new BasemapGallery({
    view: view,
  });
  const basemapExpand = new Expand({
    view: view,
    content: basemapGallery,
    expanded: false,
    expandIconClass: "esri-icon-basemap",
    expandTooltip: "BaseMap",
  });
  //for close the expand
  basemapGallery.watch("activeBasemap", () => {
    const mobileSize =
      view.heightBreakpoint === "xsmall" || view.widthBreakpoint === "xsmall";

    if (mobileSize) {
      basemapExpand.collapse();
    }
  });

  view.ui.add(basemapExpand, "top-right");
  //--------------------------co-ordinateConversion------------------------------
  const conversion = new CoordinateConversion({
    view: view,
  });

  const conversionExpand = new Expand({
    view: view,
    content: conversion,
    expanded: false,
    expandIconClass: "esri-icon-measure-area",
    expandTooltip: "CoordinateConversion",
  });

  view.ui.add(conversionExpand, "bottom-left");
  //----------------------------ReverseGeocode------------------------------
  const serviceUrl =
    "http://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer";

  view.on("click", function (evt) {
    const params = {
      location: evt.mapPoint,
    };

    locator.locationToAddress(serviceUrl, params).then(
      function (response) {
        // Show the address found
        const address = response.address;
        showAddress(address, evt.mapPoint);
      },
      function (err) {
        // Show no address found
        showAddress("No address found.", evt.mapPoint);
      }
    );
  });

  function showAddress(address, pt) {
    view.popup.open({
      title:
        +Math.round(pt.longitude * 100000) / 100000 +
        ", " +
        Math.round(pt.latitude * 100000) / 100000,
      content: address,
      location: pt,
    });
  }

  //-------------FindLeangth-and ----------------------------------------------
  const scalebar = new ScaleBar({
    view: view,
    unit: "metric",
  });

  view.ui.add(scalebar, "bottom-right");

  //Sketch view model---------
  const sketchVM = new SketchViewModel({
    layer: graphicsLayer,
    view: view,
    availableCreateTools: ["polyline", "polygon", "rectangle"],
    creationMode: "update",
    updateOnGraphicClick: true,
    visibleElements: {
      createTools: {
        point: false,
        circle: false,
      },
      selectionTools: {
        "lasso-selection": false,
        "rectangle-selection": false,
      },
      settingsMenu: false,
      undoRedoMenu: false,
    },
  });

  const measurements = document.getElementById("measurements");
  view.ui.add(measurements, "manual");
  sketchVM.on("update", (e) => {
    const geometry = e.graphics[0].geometry;

    if (e.state === "start") {
      measurements.style.display = "block";

      switchType(geometry);
    }

    if (e.state === "complete") {
      measurements.style.display = "none";
    }

    if (
      e.toolEventInfo &&
      (e.toolEventInfo.type === "scale-stop" ||
        e.toolEventInfo.type === "reshape-stop" ||
        e.toolEventInfo.type === "move-stop")
    ) {
      switchType(geometry);
    }
  });

  function getArea(polygon) {
    const geodesicArea = geometryEngine.geodesicArea(
      polygon,
      "square-kilometers"
    );
    const planarArea = geometryEngine.planarArea(polygon, "square-kilometers");

    measurements.innerHTML =
      "<b>Geodesic area</b>:  " +
      geodesicArea.toFixed(2) +
      " km\xB2" +
      " |   <b>Planar area</b>: " +
      planarArea.toFixed(2) +
      "  km\xB2";
  }

  function getLength(line) {
    const geodesicLength = geometryEngine.geodesicLength(line, "kilometers");
    const planarLength = geometryEngine.planarLength(line, "kilometers");

    measurements.innerHTML =
      "<b>Geodesic length</b>:  " +
      geodesicLength.toFixed(2) +
      " km" +
      " |   <b>Planar length</b>: " +
      planarLength.toFixed(2) +
      "  km";
  }

  function switchType(geom) {
    switch (geom.type) {
      case "polygon":
        getArea(geom);
        break;
      case "polyline":
        getLength(geom);
        break;
      default:
        console.log("No value found");
    }
  }
  //---------------------------Layer---------------------------
  const layerExpand = new Expand({
    view: view,
    content: "",
    expanded: false,
    expandIconClass: "esri-icon-layers",
    expandTooltip: "BaseMap",
  });
  view.ui.add(layerExpand, "top-left");
  //-------------------------------------------------------------
  // Add the calcite-panel for the styler to an Expand to hide/show the panel
  const stylerExpand = new Expand({
    view: view,
    content: document.getElementById("propPanel"),
    expanded: false,
    expandIconClass: "esri-icon-edit",
    expandTooltip: "Open Styler",
  });

  // Add SnappingControls to handle snapping
  const snappingControls = new SnappingControls({
    view: view,
    // Sets the widget to use the SketchViewModel's SnappingOptions
    snappingOptions: sketchVM.snappingOptions,
  });

  // Add the SnappingControls to an Expand widget to hide/show the widget
  const snappingExpand = new Expand({
    view: view,
    content: snappingControls,
    expanded: false,
    expandIconClass: "esri-icon-settings2",
    expandTooltip: "Snapping Controls",
  });

  // Add the shortcut key description panel to an Expand widget
  const shortcutKeysExpand = new Expand({
    view: view,
    content: document.getElementById("sketchVM-controls"),
    expanded: false,
    expandIconClass: "esri-icon-description",
    expandTooltip: "Keyboard Shortcuts",
  });

  view.when(() => {
    // Configure the UI to use the default property values from our SketchViewModel
    setDefaultCreateOptions();
    setDefaultUpdateOptions();
    setDefaultPointSymbol();
    setDefaultPolylineSymbol();
    setDefaultPolygonSymbol();
  });

  view.ui.add(stylerExpand, "top-right"); // Add the calcite panel
  view.ui.add(snappingExpand, "top-right"); // Add the Expand with SnappingControls widget
  view.ui.add(shortcutKeysExpand, "top-left");

  // Connecting the calcite actions with their corresponding SketchViewModel tools
  const pointBtn = document.getElementById("pointBtn");
  const polylineBtn = document.getElementById("polylineBtn");
  const polygonBtn = document.getElementById("polygonBtn");
  const circleBtn = document.getElementById("circleBtn");
  const rectangleBtn = document.getElementById("rectangleBtn");
  const clearBtn = document.getElementById("clearBtn");
  const selectBtn = document.getElementById("selectBtn");

  pointBtn.onclick = () => {
    sketchVM.create("point");
  };
  polylineBtn.onclick = () => {
    sketchVM.create("polyline");
  };
  polygonBtn.onclick = () => {
    sketchVM.create("polygon");
  };
  circleBtn.onclick = () => {
    sketchVM.create("circle");
  };
  rectangleBtn.onclick = () => {
    sketchVM.create("rectangle");
  };
  clearBtn.onclick = () => {
    sketchVM.layer.removeAll();
  };
  selectBtn.onclick = () => {
    sketchVM.cancel();
  };

  // Calcite UI logic
  // Auto-populate UI with default SketchViewModel properties set.
  // If no default values are set, UI will be set accordingly.
  function setDefaultCreateOptions() {
    const options = sketchVM.defaultCreateOptions;
    const modeSelect = document.getElementById("mode-select");

    // set default mode in the select element if defined
    if (options?.mode) {
      setDefaultOption(modeSelect, options.mode);
    }

    // handles mode select changes
    modeSelect.addEventListener("calciteSelectChange", () => {
      sketchVM.defaultCreateOptions["mode"] = modeSelect.selectedOption.value;
    });
  }

  function setDefaultUpdateOptions() {
    const options = sketchVM.defaultUpdateOptions;
    const rotationSwitch = document.getElementById("rotationSwitch");
    const scaleSwitch = document.getElementById("scaleSwitch");
    const multipleSelectionSwitch = document.getElementById(
      "multipleSelectionSwitch"
    );
    const aspectRatioSwitch = document.getElementById("aspectRatioSwitch");

    // set the UI elements to the default property values
    rotationSwitch.checked = options.enableRotation;
    scaleSwitch.checked = options.enableScaling;
    multipleSelectionSwitch.checked = options.multipleSelectionEnabled;
    aspectRatioSwitch.checked = options.preserveAspectRatio;

    // event listeners for UI interactions
    rotationSwitch.addEventListener("calciteSwitchChange", (evt) => {
      sketchVM.defaultUpdateOptions.enableRotation = evt.target.checked;
    });
    scaleSwitch.addEventListener("calciteSwitchChange", (evt) => {
      sketchVM.defaultUpdateOptions.enableScaling = evt.target.checked;
    });
    multipleSelectionSwitch.addEventListener("calciteSwitchChange", (evt) => {
      sketchVM.defaultUpdateOptions.multipleSelectionEnabled =
        evt.target.checked;
    });
    aspectRatioSwitch.addEventListener("calciteSwitchChange", (evt) => {
      sketchVM.defaultUpdateOptions.preserveAspectRatio = evt.target.checked;
    });
  }

  function setDefaultPointSymbol() {
    const pointSymbol = sketchVM.pointSymbol;
    const pointStyleSelect = document.getElementById("point-style-select");
    const pointSymbolOutlineBtn = document.getElementById("point-outline-btn");
    const pointSizeInput = document.getElementById("point-size-input");
    const pointXOffsetInput = document.getElementById("point-xoffset-input");
    const pointYOffsetInput = document.getElementById("point-yoffset-input");
    const pointAngleInput = document.getElementById("point-angle-input");
    const pointColorInput = document.getElementById("point-color-input");
    const slsWidthInput = document.getElementById("point-sls-width-input");
    const slsColorInput = document.getElementById("point-sls-color-input");

    pointSizeInput.value = pointSymbol.size;
    pointXOffsetInput.value = pointSymbol.xoffset;
    pointYOffsetInput.value = pointSymbol.yoffset;
    pointAngleInput.value = pointSymbol.angle;
    slsWidthInput.value = pointSymbol.outline.width;

    // set default style in the select element
    setDefaultOption(pointStyleSelect, pointSymbol.style);

    pointSizeInput.addEventListener("calciteInputInput", (evt) => {
      pointSymbol.size = parseInt(evt.target.value);
    });
    pointXOffsetInput.addEventListener("calciteInputInput", (evt) => {
      pointSymbol.xoffset = parseInt(evt.target.value);
    });
    pointYOffsetInput.addEventListener("calciteInputInput", (evt) => {
      pointSymbol.yoffset = parseInt(evt.target.value);
    });
    pointAngleInput.addEventListener("calciteInputInput", (evt) => {
      pointSymbol.angle = parseInt(evt.target.value);
    });
    pointStyleSelect.addEventListener("calciteSelectChange", () => {
      pointSymbol.style = pointStyleSelect.selectedOption.value;
    });
    pointColorInput.addEventListener("calciteInputInput", (evt) => {
      pointSymbol.color = evt.target.value;
    });
    pointSymbolOutlineBtn.onclick = () => {
      openModal("point-outline-modal");
    };
    // point outline modal event listeners
    slsWidthInput.addEventListener("calciteInputInput", (evt) => {
      pointSymbol.outline.width = parseInt(evt.target.value);
    });
    slsColorInput.addEventListener("calciteInputInput", (evt) => {
      pointSymbol.outline.color = evt.target.value;
    });
  }

  function setDefaultPolylineSymbol() {
    const lineSymbol = sketchVM.polylineSymbol;
    const lineStyleSelect = document.getElementById("line-style-select");
    const lineWidthInput = document.getElementById("line-width-input");
    const lineColorInput = document.getElementById("line-color-input");

    lineWidthInput.value = lineSymbol.width;

    // set default style in the select element
    setDefaultOption(lineStyleSelect, lineSymbol.style);

    lineStyleSelect.addEventListener("calciteSelectChange", () => {
      lineSymbol.style = lineStyleSelect.selectedOption.value;
    });
    lineWidthInput.addEventListener("calciteInputInput", (evt) => {
      lineSymbol.width = parseInt(evt.target.value);
    });
    lineColorInput.addEventListener("calciteInputInput", (evt) => {
      lineSymbol.color = evt.target.value;
    });
  }

  function setDefaultPolygonSymbol() {
    const polygonSymbol = sketchVM.polygonSymbol;
    const polygonStyleSelect = document.getElementById("polygon-style-select");
    const polygonSymbolOutlineBtn = document.getElementById(
      "polygon-outline-btn"
    );
    const polygonColorInput = document.getElementById("polygon-color-input");
    const slsStyleSelect = document.getElementById("polygon-sls-style-select");
    const slsWidthInput = document.getElementById("polygon-sls-width-input");
    const slsColorInput = document.getElementById("polygon-sls-color-input");

    slsWidthInput.value = polygonSymbol.outline.width;

    // set default style in the select element
    setDefaultOption(polygonStyleSelect, polygonSymbol.style);
    setDefaultOption(slsStyleSelect, polygonSymbol.outline.style);

    polygonStyleSelect.addEventListener("calciteSelectChange", () => {
      polygonSymbol.style = polygonStyleSelect.selectedOption.value;
    });
    polygonColorInput.addEventListener("calciteInputInput", (evt) => {
      polygonSymbol.color = evt.target.value;
    });
    polygonSymbolOutlineBtn.onclick = () => {
      openModal("polygon-outline-modal");
    };
    // polygon outline modal event listeners
    slsStyleSelect.addEventListener("calciteSelectChange", () => {
      polygonSymbol.outline.style = slsStyleSelect.selectedOption.value;
    });
    slsWidthInput.addEventListener("calciteInputInput", (evt) => {
      polygonSymbol.outline.width = parseInt(evt.target.value);
    });
    slsColorInput.addEventListener("calciteInputInput", (evt) => {
      polygonSymbol.outline.color = evt.target.value;
    });
  }

  // function to auto-populate calcite select components
  function setDefaultOption(selectElement, value) {
    for (let i = 0; i < selectElement.children.length; i++) {
      let option = selectElement.children[i];
      if (option.value === value) {
        option.selected = true;
      }
    }
  }

  // displays the appropriate modals
  function openModal(id) {
    document.getElementById(id).active = true;
  }
});
