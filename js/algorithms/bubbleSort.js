/**
 * AlgoVerse - Bubble Sort Engine
 * Generates step-by-step visual operations, state snapshots, and line-by-line pseudocode sync.
 */

const BubbleSortEngine = {
  name: 'Bubble Sort',
  category: 'Sorting',
  timeComplexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
  spaceComplexity: 'O(1)',
  description: 'Iteratively compares adjacent elements and swaps them if they are in the wrong order, causing the largest unsorted values to "bubble up" to the end.',

  pseudocode: [
    'for i from 0 to n - 1:',
    '  swapped = false',
    '  for j from 0 to n - i - 2:',
    '    if array[j] > array[j + 1]:',
    '      swap(array[j], array[j + 1])',
    '      swapped = true',
    '  if not swapped: break'
  ],

  generateSteps(initialArray) {
    const arr = [...initialArray];
    const n = arr.length;
    const steps = [];
    let comparisons = 0;
    let swaps = 0;

    steps.push({
      type: 'start',
      indices: [],
      arraySnapshot: [...arr],
      narration: `Starting Bubble Sort on ${n} elements. Preparing outer loop.`,
      codeLine: 1,
      metrics: { comparisons, swaps, operations: 0, status: 'Ready' }
    });

    for (let i = 0; i < n; i++) {
      let swapped = false;

      steps.push({
        type: 'outer_loop',
        indices: [],
        arraySnapshot: [...arr],
        narration: `Pass ${i + 1} of ${n}: iterating through unsorted subarray [0 ... ${n - i - 1}].`,
        codeLine: 1,
        metrics: { comparisons, swaps, operations: steps.length, status: 'Running' }
      });

      for (let j = 0; j < n - i - 1; j++) {
        comparisons++;

        // Step: Compare adjacent items
        steps.push({
          type: 'compare',
          indices: [j, j + 1],
          values: [arr[j], arr[j + 1]],
          arraySnapshot: [...arr],
          narration: `Comparing index <strong>${j}</strong> (Value: ${arr[j]}) and index <strong>${j + 1}</strong> (Value: ${arr[j + 1]}).`,
          codeLine: 4,
          metrics: { comparisons, swaps, operations: steps.length, status: 'Comparing' }
        });

        if (arr[j] > arr[j + 1]) {
          // Swap
          swaps++;
          const temp = arr[j];
          arr[j] = arr[j + 1];
          arr[j + 1] = temp;
          swapped = true;

          steps.push({
            type: 'swap',
            indices: [j, j + 1],
            values: [arr[j], arr[j + 1]],
            arraySnapshot: [...arr],
            narration: `<span class="highlight-swap">Swapping:</span> ${temp} > ${arr[j]}, moving larger element toward the right.`,
            codeLine: 5,
            metrics: { comparisons, swaps, operations: steps.length, status: 'Swapping' }
          });
        }
      }

      // Mark the last element of this pass as sorted
      const sortedIdx = n - i - 1;
      steps.push({
        type: 'mark_sorted',
        indices: [sortedIdx],
        arraySnapshot: [...arr],
        narration: `Element at index <strong>${sortedIdx}</strong> (Value: ${arr[sortedIdx]}) is now in its finalized sorted position.`,
        codeLine: 7,
        metrics: { comparisons, swaps, operations: steps.length, status: 'Running' }
      });

      if (!swapped) {
        steps.push({
          type: 'early_exit',
          indices: [],
          arraySnapshot: [...arr],
          narration: `No swaps occurred in this pass. The array is already completely sorted! (Early exit optimization)`,
          codeLine: 7,
          metrics: { comparisons, swaps, operations: steps.length, status: 'Sorted' }
        });
        break;
      }
    }

    // Mark all remaining sorted
    const allSorted = Array.from({ length: n }, (_, k) => k);
    steps.push({
      type: 'complete',
      indices: allSorted,
      arraySnapshot: [...arr],
      narration: `Bubble Sort complete! Sorted ${n} elements with ${comparisons} comparisons and ${swaps} swaps.`,
      codeLine: 7,
      metrics: { comparisons, swaps, operations: steps.length, status: 'Completed' }
    });

    return steps;
  }
};

window.BubbleSortEngine = BubbleSortEngine;
