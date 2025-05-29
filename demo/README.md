mgraph.forcelayout Vue Demo
A Vue 3 demonstration application showcasing the mgraph.forcelayout package with an extensive collection of graph datasets and interactive force-directed visualization.

Important Notice: This project is not affiliated with or endorsed by Andrei Kashcha, and any modifications are the responsibility of the maintainers of mgraph.forcelayout.

Original ngraph.forcelayout by Andrei Kashcha
Modern mgraph.forcelayout maintained by Michael Feldman


Features

🎯 Force-directed graph layout using mgraph.forcelayout
📊 100+ pre-loaded graph datasets from the University of Florida Sparse Matrix Collection
🎨 Interactive WebGL visualization with zoom, pan, and real-time layout controls
📁 Drag & drop support for .dot and .json graph files
⚙️ Real-time parameter tuning for layout algorithms
🌐 GitHub Pages deployment ready

Graph Datasets
The demo includes graphs from various domains:

Structural problems (HB collection): Geodesic domes, finite element meshes
Circuit simulation (Bai collection): Electronic circuit matrices
Social networks (Pajek collection): Football teams, collaboration networks
Power grids and infrastructure networks
Biological networks including protein interactions

Quick Start
Development
bash# Install dependencies
npm install

# Download graph datasets (optional - takes a few minutes)
npm run download-graphs

# Start development server
npm run serve
Visit http://localhost:8080 to see the demo.
Production Build
bash# Build for production
npm run build

# Deploy to GitHub Pages
./deploy.sh
Usage

Select a graph from the dropdown menu
Adjust layout parameters using the control panel:

Time step: Animation speed
Gravity: Node repulsion strength
Spring length: Ideal edge length
Drag coefficient: Simulation damping


Start/stop the layout animation
Drop your own files (.dot or .json format) into the browser

Tech Stack

Vue 3 - Progressive JavaScript framework
mgraph.forcelayout - Force-directed graph layout (ES modules)
mgraph.graph - Graph data structure
w-gl - High-performance WebGL renderer
mgraph.fromdot - DOT file parser
mgraph.fromjson - JSON graph parser
mgraph.generators - Graph generators

Project Structure
├── public/                 # Static assets and graph datasets
│   ├── hb/                # Harwell-Boeing collection
│   ├── bai/               # Bai collection  
│   ├── pajek/             # Pajek collection
│   └── ghs_indef/         # Other matrices
├── src/
│   ├── components/        # Vue components
│   ├── lib/               # Core graph/layout logic
│   │   ├── createGraphScene.js    # Main visualization setup
│   │   ├── fixedForceLayout.js    # Custom layout implementation
│   │   ├── loadGraph.js           # Graph data loader
│   │   └── ...
│   └── App.vue           # Main application component
├── scripts/              # Dataset download utilities
└── deploy.sh            # GitHub Pages deployment script
Dataset Management
Download Additional Graphs
bash# Download a curated set of test graphs
npm run download-test

# Download the full collection (100+ graphs, ~50MB)
npm run download-graphs
Add Custom Graphs

Place your graph files in public/collection/graphname/index.js
Update src/lib/getAvailableGraphs.js to include your graph
Restart the development server

Force Layout Parameters
ParameterDescriptionRangeTime StepIntegration step size0.1 - 2.0GravityNode repulsion strength-50 to -1Spring LengthIdeal edge length5 - 50Spring CoefficientEdge spring strength0.1 - 2.0Drag CoefficientVelocity damping0.1 - 0.99ThetaBarnes-Hut approximation0.0 - 1.0
Browser Support

Chrome/Edge 80+
Firefox 75+
Safari 13+
Requires WebGL support

Contributing

Fork the repository
Create a feature branch
Make your changes
Test with npm run serve
Submit a pull request

Performance Notes

Small graphs (< 1000 nodes): All algorithms work well
Medium graphs (1000-5000 nodes): Use theta > 0.5 for better performance
Large graphs (> 5000 nodes): Consider using theta = 0.8 and higher drag coefficient

License
MIT License - see LICENSE file for details.
Credits & Acknowledgments
Original Work

Andrei Kashcha - Creator of the original ngraph ecosystem
ngraph.forcelayout - Original force-directed layout implementation

Modern Implementation

Michael Feldman - Maintainer of mgraph.forcelayout ES modules
mgraph ecosystem - Modern ES module versions of graph libraries

Data & Infrastructure

University of Florida - Sparse Matrix Collection
Vue.js team - Framework foundation
WebGL community - Graphics capabilities

Disclaimer
This demonstration project uses the mgraph ecosystem and is not affiliated with or endorsed by Andrei Kashcha. While it builds upon concepts from the original ngraph libraries, any modifications, bugs, or issues are the responsibility of the mgraph.forcelayout maintainers.
Links

🔧 mgraph Issues: GitHub Issues
📊 Graph Data: UF Sparse Matrix Collection
🐦 Original Author: @anvaka
💖 Support Original Work: Patreon


Built with the mgraph ecosystem • Modern ES modules for graph visualization