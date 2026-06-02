const qr = document.querySelector("#qrPlaceholder");
const size = 17;

function isFinderCell(row, column, originRow, originColumn) {
  const localRow = row - originRow;
  const localColumn = column - originColumn;
  if (localRow < 0 || localRow > 4 || localColumn < 0 || localColumn > 4) return false;
  return localRow === 0 ||
    localRow === 4 ||
    localColumn === 0 ||
    localColumn === 4 ||
    (localRow >= 2 && localRow <= 2 && localColumn >= 2 && localColumn <= 2);
}

function isFinder(row, column) {
  return isFinderCell(row, column, 0, 0) ||
    isFinderCell(row, column, 0, size - 5) ||
    isFinderCell(row, column, size - 5, 0);
}

for (let row = 0; row < size; row += 1) {
  for (let column = 0; column < size; column += 1) {
    const cell = document.createElement("i");
    const patterned = (row * 7 + column * 11 + row * column) % 5 < 2;
    if (isFinder(row, column) || patterned) cell.classList.add("is-dark");
    qr.append(cell);
  }
}
