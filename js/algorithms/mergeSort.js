/**
 * AlgoVerse - Merge Sort Engine
 * Divide-and-Conquer sorting with 3D elevation & auxiliary merging steps.
 */

const MergeSortEngine = {
  name: 'Merge Sort',
  category: 'Sorting',
  timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
  spaceComplexity: 'O(n)',
  description: 'A classic Divide and Conquer algorithm that recursively splits the array into single-element subarrays and merges them in sorted order.',

  pseudocode: [
    'mergeSort(arr, left, right):',
    '  if left >= right: return',
    '  mid = floor((left + right) / 2)',
    '  mergeSort(arr, left, mid)',
    '  mergeSort(arr, mid + 1, right)',
    '  merge(arr, left, mid, right)'
  ],

  generateSteps(initialArray) {
    const arr = [...initialArray];
    const n = arr.length;
    const steps = [];
    let comparisons = 0;
    let swaps = 0; // Moves / Writes

    steps.push({
      type: 'start',
      indices: [],
      arraySnapshot: [...arr],
      narration: `Starting Merge Sort on ${n} elements. Recursively dividing array.`,
      codeLine: 1,
      metrics: { comparisons, swaps, operations: 0, status: 'Ready' }
    });

    const merge = (left, mid, right) => {
      const leftPart = arr.slice(left, mid + 1);
      const rightPart = arr.slice(mid + 1, right + 1);

      // Highlight the subarrays being merged (with elevation flag)
      steps.push({
        type: 'highlight_subarrays',
        indices: Array.from({ length: right - left + 1 }, (_, i) => left + i),
        leftRange: [left, mid],
        rightRange: [mid + 1, right],
        arraySnapshot: [...arr],
        narration: `Merging subarrays: <strong>Left [${left}..${mid}]</strong> and <strong>Right [${mid + 1}..${right}]</strong>.`,
        codeLine: 6,
        metrics: { comparisons, swaps, operations: steps.length, status: 'Running' }
      });

      let i = 0;
      let j = 0;
      let k = left;

      while (i < leftPart.length && j < rightPart.length) {
        comparisons++;
        const leftIdx = left + i;
        const rightIdx = mid + 1 + j;

        steps.push({
          type: 'compare',
          indices: [leftIdx, rightIdx],
          values: [leftPart[i], rightPart[j]],
          arraySnapshot: [...arr],
          narration: `Comparing Left head <strong>${leftPart[i]}</strong> (idx ${leftIdx}) with Right head <strong>${rightPart[j]}</strong> (idx ${rightIdx}).`,
          codeLine: 6,
          metrics: { comparisons, swaps, operations: steps.length, status: 'Comparing' }
        });

        if (leftPart[i] <= rightPart[j]) {
          swaps++;
          arr[k] = leftPart[i];
          steps.push({
            type: 'write',
            indices: [k],
            values: [leftPart[i]],
            arraySnapshot: [...arr],
            narration: `Placing smaller element <span class="highlight-swap">${leftPart[i]}</span> into merged position <strong>${k}</strong>.`,
            codeLine: 6,
            metrics: { comparisons, swaps, operations: steps.length, status: 'Swapping' }
          });
          i++;
        } else {
          swaps++;
          arr[k] = rightPart[j];
          steps.push({
            type: 'write',
            indices: [k],
            values: [rightPart[j]],
            arraySnapshot: [...arr],
            narration: `Placing smaller element <span class="highlight-swap">${rightPart[j]}</span> into merged position <strong>${k}</strong>.`,
            codeLine: 6,
            metrics: { comparisons, swaps, operations: steps.length, status: 'Swapping' }
          });
          j++;
        }
        k++;
      }

      while (i < leftPart.length) {
        swaps++;
        arr[k] = leftPart[i];
        steps.push({
          type: 'write',
          indices: [k],
          values: [leftPart[i]],
          arraySnapshot: [...arr],
          narration: `Appending remaining Left element <span class="highlight-swap">${leftPart[i]}</span> at index <strong>${k}</strong>.`,
          codeLine: 6,
          metrics: { comparisons, swaps, operations: steps.length, status: 'Swapping' }
        });
        i++;
        k++;
      }

      while (j < rightPart.length) {
        swaps++;
        arr[k] = rightPart[j];
        steps.push({
          type: 'write',
          indices: [k],
          values: [rightPart[j]],
          arraySnapshot: [...arr],
          narration: `Appending remaining Right element <span class="highlight-swap">${rightPart[j]}</span> at index <strong>${k}</strong>.`,
          codeLine: 6,
          metrics: { comparisons, swaps, operations: steps.length, status: 'Swapping' }
        });
        j++;
        k++;
      }

      // Mark this range as sorted for now
      steps.push({
        type: 'mark_sorted',
        indices: Array.from({ length: right - left + 1 }, (_, idx) => left + idx),
        arraySnapshot: [...arr],
        narration: `Subarray [${left}..${right}] successfully merged and ordered.`,
        codeLine: 6,
        metrics: { comparisons, swaps, operations: steps.length, status: 'Running' }
      });
    };

    const divide = (left, right) => {
      if (left >= right) return;
      const mid = Math.floor((left + right) / 2);

      steps.push({
        type: 'split',
        indices: [left, mid, right],
        arraySnapshot: [...arr],
        narration: `Splitting range [${left}..${right}] at midpoint <strong>${mid}</strong>.`,
        codeLine: 3,
        metrics: { comparisons, swaps, operations: steps.length, status: 'Running' }
      });

      divide(left, mid);
      divide(mid + 1, right);
      merge(left, mid, right);
    };

    divide(0, n - 1);

    const allSorted = Array.from({ length: n }, (_, k) => k);
    steps.push({
      type: 'complete',
      indices: allSorted,
      arraySnapshot: [...arr],
      narration: `Merge Sort complete! All ${n} elements fully sorted in O(n log n) time.`,
      codeLine: 6,
      metrics: { comparisons, swaps, operations: steps.length, status: 'Completed' }
    });

    return steps;
  }
};

window.MergeSortEngine = MergeSortEngine;
