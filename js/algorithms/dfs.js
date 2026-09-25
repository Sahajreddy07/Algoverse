/**
 * AlgoVerse - Depth-First Search (DFS) Engine
 * Deep-branch traversal with live LIFO Stack tracking and backtracking visualization.
 */

const DFSEngine = {
  name: 'Depth-First Search (DFS)',
  category: 'Graph Traversal',
  timeComplexity: { best: 'O(V + E)', average: 'O(V + E)', worst: 'O(V + E)' },
  spaceComplexity: 'O(V)',
  description: 'Explores as far as possible along each branch before backtracking, utilizing a LIFO (Last-In-First-Out) Stack or recursive call stack.',

  pseudocode: [
    'create stack S, push start node',
    'while S is not empty:',
    '  current = pop(S)',
    '  if current not in visited:',
    '    mark current as visited',
    '    for each unvisited neighbor of current:',
    '      push(S, neighbor)'
  ],

  generateSteps(graph = null, startNodeId = 0) {
    const g = graph || BFSEngine.defaultGraph;
    const n = g.nodes.length;
    const steps = [];

    // Adjacency list
    const adj = Array.from({ length: n }, () => []);
    g.edges.forEach(([u, v]) => {
      adj[u].push(v);
      adj[v].push(u);
    });
    // Sort in reverse order so lowest indexed neighbor is popped first from LIFO stack
    adj.forEach(list => list.sort((a, b) => b - a));

    const visited = new Set();
    const stack = [];
    const activeEdges = [];

    let comparisons = 0;
    let operations = 0;

    // Push start node to stack
    stack.push(startNodeId);

    steps.push({
      type: 'start',
      currentNode: startNodeId,
      visitedNodes: Array.from(visited),
      stackSnapshot: [...stack],
      traversedEdges: [...activeEdges],
      narration: `Initializing DFS at start node <strong>${g.nodes[startNodeId].label}</strong>. Pushed to LIFO Stack.`,
      codeLine: 1,
      metrics: { comparisons: 0, swaps: 0, operations: 0, status: 'Ready' }
    });

    while (stack.length > 0) {
      operations++;
      const current = stack.pop();
      const currentLabel = g.nodes[current].label;

      if (!visited.has(current)) {
        visited.add(current);

        steps.push({
          type: 'visit_node',
          currentNode: current,
          visitedNodes: Array.from(visited),
          stackSnapshot: [...stack],
          traversedEdges: [...activeEdges],
          narration: `Popped node <strong>${currentLabel}</strong> from Stack. Visited count: ${visited.size}.`,
          codeLine: 5,
          metrics: { comparisons, swaps: visited.size, operations, status: 'Running' }
        });

        const neighbors = adj[current];
        for (const neighbor of neighbors) {
          comparisons++;
          const neighborLabel = g.nodes[neighbor].label;

          if (!visited.has(neighbor)) {
            stack.push(neighbor);
            activeEdges.push([current, neighbor]);

            steps.push({
              type: 'push_neighbor',
              currentNode: current,
              neighborNode: neighbor,
              visitedNodes: Array.from(visited),
              stackSnapshot: [...stack],
              traversedEdges: [...activeEdges],
              narration: `Discovered unvisited branch neighbor <strong>${neighborLabel}</strong>. Pushing onto Stack.`,
              codeLine: 7,
              metrics: { comparisons, swaps: visited.size, operations: steps.length, status: 'Running' }
            });
          }
        }
      } else {
        steps.push({
          type: 'backtrack',
          currentNode: current,
          visitedNodes: Array.from(visited),
          stackSnapshot: [...stack],
          traversedEdges: [...activeEdges],
          narration: `Node <strong>${currentLabel}</strong> was already visited earlier in another path. Backtracking.`,
          codeLine: 4,
          metrics: { comparisons, swaps: visited.size, operations: steps.length, status: 'Running' }
        });
      }
    }

    steps.push({
      type: 'complete',
      currentNode: null,
      visitedNodes: Array.from(visited),
      stackSnapshot: [],
      traversedEdges: [...activeEdges],
      narration: `DFS Traversal complete! Visited ${visited.size} nodes via depth-first branches.`,
      codeLine: 2,
      metrics: { comparisons, swaps: visited.size, operations: steps.length, status: 'Completed' }
    });

    return steps;
  }
};

window.DFSEngine = DFSEngine;
