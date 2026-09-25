/**
 * AlgoVerse - Binary Search Engine
 * Visualizes 3D cubes with animated floating LOW, MID, HIGH pointers and range elimination.
 */

const BinarySearchEngine = {
  name: 'Binary Search',
  category: 'Searching',
  timeComplexity: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)' },
  spaceComplexity: 'O(1)',
  description: 'Searches a sorted array by repeatedly halving the search interval. Compares target with the midpoint to discard half the remaining elements.',

  pseudocode: [
    'low = 0, high = n - 1',
    'while low <= high:',
    '  mid = floor((low + high) / 2)',
    '  if array[mid] == target: return mid',
    '  else if array[mid] < target: low = mid + 1',
    '  else: high = mid - 1',
    'return -1 (Not Found)'
  ],

  generateSteps(initialArray, targetValue = null) {
    // Binary search requires sorted array
    const arr = [...initialArray].sort((a, b) => a - b);
    const n = arr.length;
    const steps = [];

    // If targetValue is not specified or not in range, pick a reasonable target (e.g. median or specific element)
    const target = (targetValue !== null && !isNaN(targetValue)) 
      ? Number(targetValue) 
      : arr[Math.floor(n * 0.65)];

    let low = 0;
    let high = n - 1;
    let comparisons = 0;
    let discardedIndices = [];

    steps.push({
      type: 'start',
      low,
      high,
      mid: null,
      target,
      discarded: [],
      arraySnapshot: [...arr],
      narration: `Searching for target <strong>${target}</strong> in sorted array of ${n} elements. Initial bounds: [0 .. ${n - 1}].`,
      codeLine: 1,
      metrics: { comparisons: 0, swaps: 0, operations: 0, status: 'Ready' }
    });

    let found = false;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      comparisons++;

      // Step: Inspect Midpoint
      steps.push({
        type: 'inspect_mid',
        low,
        high,
        mid,
        target,
        discarded: [...discardedIndices],
        arraySnapshot: [...arr],
        narration: `Current window [${low} .. ${high}]. Midpoint index is <strong>${mid}</strong> (Value: ${arr[mid]}). Comparing with target ${target}.`,
        codeLine: 3,
        metrics: { comparisons, swaps: 0, operations: steps.length, status: 'Comparing' }
      });

      if (arr[mid] === target) {
        found = true;
        // Step: Found!
        steps.push({
          type: 'found',
          low,
          high,
          mid,
          target,
          discarded: [...discardedIndices],
          arraySnapshot: [...arr],
          narration: `<span class="highlight-found">Success!</span> Target <strong>${target}</strong> found at index <strong>${mid}</strong> after ${comparisons} comparison${comparisons > 1 ? 's' : ''}!`,
          codeLine: 4,
          metrics: { comparisons, swaps: 0, operations: steps.length, status: 'Found' }
        });
        break;
      } else if (arr[mid] < target) {
        // Discard left half including mid
        const newlyDiscarded = [];
        for (let k = low; k <= mid; k++) {
          if (!discardedIndices.includes(k)) {
            discardedIndices.push(k);
            newlyDiscarded.push(k);
          }
        }

        steps.push({
          type: 'discard_left',
          low,
          high,
          mid,
          target,
          discarded: [...discardedIndices],
          newlyDiscarded,
          arraySnapshot: [...arr],
          narration: `${arr[mid]} < ${target}. Target must be in the upper half. Discarding indices [${low} .. ${mid}].`,
          codeLine: 5,
          metrics: { comparisons, swaps: 0, operations: steps.length, status: 'Running' }
        });

        low = mid + 1;
      } else {
        // Discard right half including mid
        const newlyDiscarded = [];
        for (let k = mid; k <= high; k++) {
          if (!discardedIndices.includes(k)) {
            discardedIndices.push(k);
            newlyDiscarded.push(k);
          }
        }

        steps.push({
          type: 'discard_right',
          low,
          high,
          mid,
          target,
          discarded: [...discardedIndices],
          newlyDiscarded,
          arraySnapshot: [...arr],
          narration: `${arr[mid]} > ${target}. Target must be in the lower half. Discarding indices [${mid} .. ${high}].`,
          codeLine: 6,
          metrics: { comparisons, swaps: 0, operations: steps.length, status: 'Running' }
        });

        high = mid - 1;
      }
    }

    if (!found) {
      steps.push({
        type: 'not_found',
        low,
        high,
        mid: null,
        target,
        discarded: Array.from({ length: n }, (_, i) => i),
        arraySnapshot: [...arr],
        narration: `Search bounds exhausted (low > high). Target <strong>${target}</strong> does not exist in the array.`,
        codeLine: 7,
        metrics: { comparisons, swaps: 0, operations: steps.length, status: 'Completed' }
      });
    }

    return steps;
  }
};

window.BinarySearchEngine = BinarySearchEngine;
