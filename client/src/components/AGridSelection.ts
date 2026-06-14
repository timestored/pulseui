export type GridCellPosition = {
  row: number;
  cell: number;
};

export type GridCellSelection = {
  item: Record<string, any>;
  column: { name: string };
};

export function getGridCellSelection(grid: any, position: GridCellPosition | null | undefined): GridCellSelection | null {
  if (!position || !Number.isInteger(position.row) || !Number.isInteger(position.cell)) {
    return null;
  }

  const item = grid.getDataItem(position.row);
  const column = grid.getColumns()?.[position.cell];
  if (item === null || typeof item !== "object" || !column) {
    return null;
  }

  return { item, column };
}
