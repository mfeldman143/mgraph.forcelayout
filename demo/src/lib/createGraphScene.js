// src/lib/createGraphScene.js
/* eslint-disable no-unused-vars */
import {createScene, createGuide} from 'w-gl';
import LineCollection from './LineCollection';
import PointCollection from './PointCollection';
import bus from './bus';
import createForceLayout from './createForceLayout';
import findLargestComponent from './findLargestComponent';
import createGraph from 'mgraph.graph';

export default function createGraphScene(canvas, layoutSettings = {}) {
  let drawLinks = true;

  // Since graph can be loaded dynamically, we have these uninitialized
  // and captured into closure. loadGraph will do the initialization
  let graph, layout;
  let scene, nodes, lines, guide;

  let fixedViewBox = false;
  let isRunning = false;
  let rafHandle;

  bus.on('load-graph', loadGraph);

  return {
    dispose,
    runLayout,
    updateLayoutSettings,
    setFixedViewBox,
  };

  function loadGraph(newGraph, desiredLayout) {
    if (newGraph) {
    }
    if (scene) {
      scene.dispose();
      // It's good practice to check if layout exists before calling dispose
      if (layout) layout.dispose();
      scene = null
      isRunning = false;
      cancelAnimationFrame(rafHandle);
    }
    // newGraph = createGraph(); newGraph.addLink(1, 2)
    scene = initScene();

    graph = newGraph; //findLargestComponent(newGraph, 1)[0];

    // Let them play on console with it!
    window.graph = graph;

    guide = createGuide(scene, {showGrid: true, lineColor: 0xffffff10, maxAlpha: 0x10, showCursor: false});
    // this is a standard force layout
    layout = createForceLayout(graph, layoutSettings);

    //standardizePositions(layout)
    let minX = -42, minY = -42;
    let maxX = 42, maxY = 42;

    setSceneSize(Math.max(maxX - minX, maxY - minY) * 1.2);
    initUIElements();

    rafHandle = requestAnimationFrame(frame);
  }

  function setSceneSize(sceneSize) {
    scene.setViewBox({
      left:  -sceneSize,
      top:   -sceneSize,
      right:  sceneSize,
      bottom: sceneSize,
    });
  }

  function runLayout(newIsRunning) {
    isRunning = newIsRunning;
  }

  function updateLayoutSettings(newLayoutSettings) {
    let props = ['timeStep', 'springLength', 'springCoefficient', 'dimensions', 'dragCoefficient', 'gravity', 'theta']
    let previousDimensions = (layoutSettings && layoutSettings.dimensions) || 2;
    layoutSettings = props.reduce((settings, name) => (settings[name] = newLayoutSettings[name], settings), {});
    if (!layout) return;

    if (layoutSettings.dimensions !== previousDimensions) {
      let prevLayout = layout;
      layout = createForceLayout(graph, layoutSettings)
      graph.forEachNode(node => {
        let prevPos = prevLayout.getNodePosition(node.id);
        let positions = Object.keys(prevPos).map(name => prevPos[name]);
        for (let i = previousDimensions; i < layoutSettings.dimensions; ++i) {
          // If new layout has more dimensions than the previous layout, fill those with random values:
          positions.push(Math.random());
        }
        positions.unshift(node.id);
        layout.setNodePosition.apply(layout, positions);
      });

      prevLayout.dispose();
    } else {
      props.forEach(name => {
        // Ensure layout.simulator exists and the properties are functions
        if (layout.simulator && typeof layout.simulator[name] === 'function') {
          layout.simulator[name](layoutSettings[name]);
        }
      });
    }
  }

  function setFixedViewBox(isFixed) {
    fixedViewBox = isFixed;
  }

  function initScene() {
    let scene = createScene(canvas);
    scene.setClearColor(12/255, 41/255, 82/255, 1)
    return scene;
  }
  
  function initUIElements() {
    nodes = new PointCollection(scene.getGL(), {
      capacity: graph.getNodesCount()
    });

    graph.forEachNode(node => {
      var point = layout.getNodePosition(node.id);
      let size = 1;
      if (node.data && node.data.size) {
        size = node.data.size;
      } else {
        if (!node.data) node.data = {};
        node.data.size = size;
      }
      // Ensure point.z exists or default to 0
      node.ui = {size, position: [point.x, point.y, point.z || 0], color: 0x90f8fcff};
      node.uiId = nodes.add(node.ui);
    });

    lines = new LineCollection(scene.getGL(), { capacity: graph.getLinksCount() });

    graph.forEachLink(link => {
      var from = layout.getNodePosition(link.fromId);
      var to = layout.getNodePosition(link.toId);
      // Ensure from.z and to.z exist or default to 0
      var line = { from: [from.x, from.y, from.z || 0], to: [to.x, to.y, to.z || 0], color: 0xFFFFFF10 };
      link.ui = line;
      link.uiId = lines.add(link.ui);
    });
    // lines.add({from: [0, 0, 0], to: [0, 10, 0], color: 0xFF0000FF})

    scene.appendChild(lines);
    scene.appendChild(nodes);
  }

  function frame() {
    rafHandle = requestAnimationFrame(frame);

    if (isRunning) {
      if (layout) layout.step(); // Check if layout exists
      if (fixedViewBox && layout) { // Check if layout exists
        let rect = layout.getGraphRect();
        if (rect) { // Check if rect exists
          scene.setViewBox({
            left:  rect.min_x,
            top:   rect.min_y,
            right:  rect.max_x,
            bottom: rect.max_y,
          });
        }
      }
    }
    drawGraph();
    if (scene) scene.renderFrame(); // Check if scene exists
    // console.log('🎬 Frame rendered'); // Uncomment temporarily to test
  }

  function drawGraph() {
    if (!graph || !layout) return; // Ensure graph and layout are initialized

    let names = ['x', 'y', 'z']
    graph.forEachNode(node => {
      if (!node.ui) return; // Skip if node.ui is not initialized
      let pos = layout.getNodePosition(node.id);
      if (!pos) return; // Skip if position is not available

      let uiPosition = node.ui.position;
      for (let i = 0; i < 3; ++i) {
        uiPosition[i] = pos[names[i]] || 0;
      }
      nodes.update(node.uiId, node.ui)
    });

    if (drawLinks) {
      graph.forEachLink(link => {
        if (!link.ui) return; // Skip if link.ui is not initialized
        var fromPos = layout.getNodePosition(link.fromId);
        var toPos = layout.getNodePosition(link.toId);

        if (!fromPos || !toPos) return; // Skip if positions are not available

        let {from, to} = link.ui;

        for (let i = 0; i < 3; ++i) {
          from[i] = fromPos[names[i]] || 0;
          to[i] = toPos[names[i]] || 0;
        }
        lines.update(link.uiId, link.ui);
      })
    }
  }

  function lerp(aColor, bColor) {
    let ar = (aColor >> 24) & 0xFF;
    let ag = (aColor >> 16) & 0xFF;
    let ab = (aColor >> 8)  & 0xFF;
    let br = (bColor >> 24) & 0xFF;
    let bg = (bColor >> 16) & 0xFF;
    let bb = (bColor >> 8)  & 0xFF;
    let r = Math.floor((ar + br) / 2);
    let g = Math.floor((ag + bg) / 2);
    let b = Math.floor((ab + bb) / 2);
    return (r << 24) | (g << 16) | (b << 8) | 0xF0;
  }

  function dispose() {
    cancelAnimationFrame(rafHandle);

    if (scene) scene.dispose();
    if (layout) layout.dispose(); // Ensure layout is disposed
    bus.off('load-graph', loadGraph);
  }
}

function standardizePositions(layout) {
  let arr = [];
  let avgX = 0, avgY = 0;
  // Ensure layout and layout.forEachBody exist
  if (!layout || typeof layout.forEachBody !== 'function') return;

  layout.forEachBody(body => {
    if (body && body.pos) { // Ensure body and body.pos exist
      arr.push(body.pos);
      avgX += body.pos.x;
      avgY += body.pos.y;
    }
  });

  if (arr.length === 0) return; // Avoid division by zero

  let meanX = avgX / arr.length;
  let meanY = avgY / arr.length;
  let varX = 0, varY = 0;
  arr.forEach(pos => {
    varX += Math.pow(pos.x - meanX, 2);
    varY += Math.pow(pos.y - meanY, 2);
  });
  varX = Math.sqrt(varX / arr.length);
  varY = Math.sqrt(varY / arr.length);
  arr.forEach(pos => {
    pos.x = (varX === 0) ? 0 : (10 * (pos.x - meanX) / varX); // Avoid division by zero
    pos.y = (varY === 0) ? 0 : (10 * (pos.y - meanY) / varY); // Avoid division by zero
  });
}
