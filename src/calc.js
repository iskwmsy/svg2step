export { calc_roundNumber, calc_degreesToRadians, calc_multiplyMatrix };

function calc_roundNumber(number, decimalPlaces = 3) {
  const factor = Math.pow(10, decimalPlaces);
  return Math.round(number * factor) / factor;
}

function calc_degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

// Function to multiply two matrices
function calc_multiplyMatrix(a, b) {
  const rowsA = a.length;
  const colsA = a[0].length;
  const rowsB = b.length;
  const colsB = b[0].length;
  const result = new Array(rowsA).fill(0).map(() => new Array(colsB).fill(0));
  if (colsA !== rowsB) {
    throw new Error("Columns of matrix A must match rows of matrix B.");
  }

  a.forEach((rowA, i) => {
    b[0].forEach((_, j) => {
      let sum = 0;
      rowA.forEach((_, k) => {
        sum += a[i][k] * b[k][j];
      });
      result[i][j] = sum;
    });
  });
  return result;
}
