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
  console.log('🎨 createGraphScene called');
  console.log('Canvas:', canvas);
  console.log('Layout settings:', layoutSettings);
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
    console.log('📊 loadGraph called with:', newGraph);
    if (newGraph) {
      console.log('Graph nodes:', newGraph.getNodesCount());
      console.log('Graph links:', newGraph.getLinksCount());
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

    // --- BEGIN PROPOSED FIX for node.links ---
    // Ensure each node has a .links property which is an array of its incident links.
    // mgraph.forcelayout expects this structure.
    if (graph && typeof graph.forEachNode === 'function' && typeof graph.forEachLink === 'function') {
      const nodeLinksMap = new Map();

      graph.forEachLink(link => {
        // Add link to the source node's list
        if (!nodeLinksMap.has(link.fromId)) {
          nodeLinksMap.set(link.fromId, []);
        }
        nodeLinksMap.get(link.fromId).push(link);

        // Add link to the target node's list (if different from source, to avoid duplicates for self-loops in the list)
        // Depending on how mgraph.forcelayout uses node.links, double-adding for undirected edges might be intended or not.
        // Assuming each link should appear in lists of both its connected nodes.
        if (link.fromId !== link.toId) {
          if (!nodeLinksMap.has(link.toId)) {
            nodeLinksMap.set(link.toId, []);
          }
          nodeLinksMap.get(link.toId).push(link);
        }
      });

      graph.forEachNode(node => {
        node.links = nodeLinksMap.get(node.id) || [];
        // --- BEGIN PROPOSED FIX for node.mass ---
        // Ensure each node has a numeric mass property.
        if (typeof node.mass !== 'number' || isNaN(node.mass)) {
          node.mass = 1.0; // Default mass
        }
        // --- END PROPOSED FIX for node.mass ---
      });
      console.log('🔗 Node links and mass populated for mgraph.forcelayout compatibility.');
    }
    // --- END PROPOSED FIX for node.links ---

    // Let them play on console with it!
    window.graph = graph;

    guide = createGuide(scene, {showGrid: true, lineColor: 0xffffff10, maxAlpha: 0x10, showCursor: false});
    // this is a standard force layout
    layout = createForceLayout(graph, layoutSettings);
    console.log('🔧 Layout created:', layout);

    //standardizePositions(layout)
    let minX = -42, minY = -42;
    let maxX = 42, maxY = 42;

    setSceneSize(Math.max(maxX - minX, maxY - minY) * 1.2);
    initUIElements();
    console.log('🎭 UI elements initialized');

    rafHandle = requestAnimationFrame(frame);
    console.log('🎬 Animation started');
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
    console.log('🎭 Initializing UI elements...');
    nodes = new PointCollection(scene.getGL(), {
      capacity: graph.getNodesCount()
    });
    console.log('Points collection created for', graph.getNodesCount(), 'nodes');

    graph.forEachNode(node => {
      var point = layout.getNodePosition(node.id);
      console.log('Node', node.id, 'position:', point);
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
    console.log('Lines collection created for', graph.getLinksCount(), 'links');

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
    console.log('✅ UI elements added to scene');
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
