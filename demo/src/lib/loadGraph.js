// lib/loadGraph.js
import createGraph from 'mgraph.graph';
import miserables from 'miserables';
import generate from 'mgraph.generators';

let cache = simpleCache();

export default function loadGraph(name) {
  if (name === 'Miserables') return Promise.resolve(miserables);
  if (name === 'Binary') return Promise.resolve(generate.balancedBinTree(10));

  let mtxObject = cache.get(name);
  if (mtxObject) return Promise.resolve(renderGraph(mtxObject.links, mtxObject.recordsPerEdge));

  // Convert "HB/blckhole" to "./assets/hb/blckhole/index.js"
  const normalizedPath = name.toLowerCase(); // Remove the unnecessary replace
  const url = `./${normalizedPath}/index.js`;
  
  console.log(`Loading graph from: ${url}`); // Debug log
  
  return fetch(url)
    .then(x => {
      if (!x.ok) {
        throw new Error(`HTTP ${x.status}: ${x.statusText}`);
      }
      return x.json();
    })
    .then(mtxObject => {
      cache.put(name, mtxObject);
      return renderGraph(mtxObject.links, mtxObject.recordsPerEdge);
    })
    .catch(error => {
      console.error(`Failed to load graph ${name} from ${url}:`, error);
      // Fallback to a simple generated graph
      return generate.path(20);
    });
}

function renderGraph (edges, recordsPerEdge) {
  let graph = createGraph();
  for(var i = 0; i < edges.length - 1; i += recordsPerEdge) {
      graph.addLink(edges[i], edges[i + 1]);
  }
  return graph;
}

function simpleCache() {
    var supported = 'localStorage' in window;

    return {
        get : function(key) {
            if (!supported) { return null; }
            var graphData = JSON.parse(window.localStorage.getItem(key));
            if (!graphData || graphData.recordsPerEdge === undefined) {
              return null;
            }
            return graphData;
        },
        put : function(key, value) {
            if (!supported) { return false;}
            try {
                window.localStorage.setItem(key, JSON.stringify(value));
            } catch(err) {
                window.localStorage.clear();
            }
        }
    };
}