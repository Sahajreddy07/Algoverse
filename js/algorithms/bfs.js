/**
 * AlgoVerse - Breadth-First Search (BFS) Engine
 * Layer-by-layer graph traversal with live FIFO Queue tracking and 3D node glow states.
 */

const BFSEngine = {
  name: 'Breadth-First Search (BFS)',
  category: 'Graph Traversal',
  timeComplexity: { best: 'O(V + E)', average: 'O(V + E)', worst: 'O(V + E)' },
  spaceComplexity: 'O(V)',
  description: 'Explores the graph level by level from the start node using a FIFO (First-In-First-Out) Queue, ensuring the shortest path in unweighted graphs.',

  pseudocode: [
    'create queue Q, mark start as visited',
    'enqueue(Q, start)',
    'while Q is not empty:',
    '  current = dequeue(Q)',
    '  for each unvisited neighbor of current:',
    '    mark neighbor as visited',
    '    enqueue(Q, neighbor)'
  ],

  // Default rich 3D graph representation
  defaultGraph: {
    nodes: [
      { id: 0, label: 'A', x: 0, y: 70, z: 0 },
      { id: 1, label: 'B', x: -110, y: 25, z: 50 },
      { id: 2, label: 'C', x: 20, y: 35, z: -100 },
      { id: 3, label: 'D', x: 120, y: 20, z: 40 },
      { id: 4, label: 'E', x: -140, y: -65, z: -30 },
      { id: 5, label: 'F', x: -45, y: -75, z: 70 },
      { id: 6, label: 'G', x: 55, y: -75, z: -70 },
      { id: 7, label: 'H', x: 140, y: -65, z: -20 }
    ],
    edges: [
      [0, 1], [0, 2], [0, 3],
      [1, 4], [1, 5],
      [2, 5], [2, 6],
      [3, 6], [3, 7],
      [4, 5], [6, 7]
    ]
  },

  generateSteps(graph = null, startNodeId = 0) {
    const g = graph || this.defaultGraph;
    const n = g.nodes.length;
    const steps = [];

    // Adjacency list
    const adj = Array.from({ length: n }, () => []);
    g.edges.forEach(([u, v]) => {
      adj[u].push(v);
      adj[v].push(u);
    });
    // Sort neighbor lists for consistent deterministic traversal
    adj.forEach(list => list.sort((a, b) => a - b));

    const visited = new Set();
    const queue = [];
    const activeEdges = []; // edges that are part of the traversal tree

    let operations = 0;
    let comparisons = 0; // neighbor checks

    // Step 0: Start
    queue.push(startNodeId);
    visited.add(startNodeId);

    steps.push({
      type: 'start',
      currentNode: startNodeId,
      visitedNodes: Array.from(visited),
      queueSnapshot: [...queue],
      traversedEdges: [...activeEdges],
      narration: `Initializing BFS at root node <strong>${g.nodes[startNodeId].label}</strong>. Enqueuing into FIFO Queue.`,
      codeLine: 2,
      metrics: { comparisons: 0, swaps: 0, operations: 0, status: 'Ready' }
    });

    while (queue.length > 0) {
      operations++;
      const current = queue.shift();
      const currentLabel = g.nodes[current].label;

      steps.push({
        type: 'visit_node',
        currentNode: current,
        visitedNodes: Array.from(visited),
        queueSnapshot: [...queue],
        traversedEdges: [...activeEdges],
        narration: `Dequeued node <strong>${currentLabel}</strong>. Now inspecting all unvisited neighbors.`,
        codeLine: 4,
        metrics: { comparisons, swaps: visited.size, operations, status: 'Running' }
      });

      const neighbors = adj[current];
      for (const neighbor of neighbors) {
        comparisons++;
        const neighborLabel = g.nodes[neighbor].label;

        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
          activeEdges.push([current, neighbor]);

          steps.push({
            type: 'enqueue_neighbor',
            currentNode: current,
            neighborNode: neighbor,
            visitedNodes: Array.from(visited),
            queueSnapshot: [...queue],
            traversedEdges: [...activeEdges],
            narration: `Discovered unvisited neighbor <strong>${neighborLabel}</strong> from ${currentLabel}. Enqueuing to Queue.`,
            codeLine: 7,
            metrics: { comparisons, swaps: visited.size, operations: steps.length, status: 'Running' }
          });
        } else {
          // Already visited neighbor
          steps.push({
            type: 'skip_neighbor',
            currentNode: current,
            neighborNode: neighbor,
            visitedNodes: Array.from(visited),
            queueSnapshot: [...queue],
            traversedEdges: [...activeEdges],
            narration: `Neighbor <strong>${neighborLabel}</strong> has already been visited. Skipping.`,
            codeLine: 5,
            metrics: { comparisons, swaps: visited.size, operations: steps.length, status: 'Running' }
          });
        }
      }
    }

    steps.push({
      type: 'complete',
      currentNode: null,
      visitedNodes: Array.from(visited),
      queueSnapshot: [],
      traversedEdges: [...activeEdges],
      narration: `BFS Traversal completed! All ${visited.size} reachable nodes explored level-by-level.`,
      codeLine: 3,
      metrics: { comparisons, swaps: visited.size, operations: steps.length, status: 'Completed' }
    });

    return steps;
  }
};

window.BFSEngine = BFSEngine;
