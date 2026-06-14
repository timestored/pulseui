import { getGridCellSelection } from "./AGridSelection";

describe("getGridCellSelection", () => {
  const item = { symbol: "AAPL", price: 191.25 };
  const priceColumn = { name: "price" };
  const grid = {
    getDataItem: (row: number) => row === 2 ? item : undefined,
    getColumns: () => [{ name: "symbol" }, priceColumn],
  };

  it("returns the row item and active column", () => {
    expect(getGridCellSelection(grid, { row: 2, cell: 1 })).toEqual({
      item,
      column: priceColumn,
    });
  });

  it("ignores positions without a valid row item or column", () => {
    expect(getGridCellSelection(grid, null)).toBeNull();
    expect(getGridCellSelection(grid, { row: 3, cell: 1 })).toBeNull();
    expect(getGridCellSelection(grid, { row: 2, cell: 4 })).toBeNull();
  });
});
