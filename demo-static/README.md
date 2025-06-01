## Demo Static (ES Modules)

This folder demonstrates how to use `mgraph.forcelayout` with ES Modules and an import map in a modern browser.

The main example is in `index.html`. It showcases the force layout library by rendering different graph types (Grid, Complete, Circular Ladder) dynamically.

**How to Run:**

1.  **Ensure `http-server` is installed:** If you don't have it, install it globally:
    `npm install -g http-server`
2.  **Navigate to the project root:**
    `cd e:/map-of-reddit-a18/_zServer-mapofreddit/ngraph.fromdotZ/mgraph/forcelayout`
3.  **Start the HTTP server:**
    `http-server .`
4.  **Open in browser:** Navigate to `http://localhost:8080/demo-static/index.html` in a modern web browser (e.g., Chrome, Firefox, Edge) that supports import maps.
5.  **Interact:** Click the buttons to switch between different graph examples.

**Key Features Demonstrated:**

*   **ES Modules (ESM)**: Loading `mgraph.forcelayout` and its dependencies as native ES Modules.
*   **Import Maps**: Resolving bare module specifiers (`mgraph.forcelayout`, `mgraph.graph`, etc.) to local file paths.
*   **Dynamic Graph Generation**: Using JavaScript to create different graph structures.
*   **SVG Rendering**: Visualizing the force-directed graph layouts using SVG.
