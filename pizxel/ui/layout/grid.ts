/**
 * Grid Layout
 *
 * Arranges children in rows and columns.
 */

import { Container, ContainerOptions } from "../core/container";
import { Widget } from "../core/widget";

export interface GridOptions extends ContainerOptions {
  columns: number;
  rows?: number;
  columnSpacing?: number;
  rowSpacing?: number;
  cellWidth?: number;
  cellHeight?: number;
}

export class Grid extends Container {
  private columns: number;
  private rows?: number;
  private columnSpacing: number;
  private rowSpacing: number;
  private cellWidth?: number;
  private cellHeight?: number;

  constructor(options: GridOptions) {
    super(options);
    this.columns = options.columns;
    this.rows = options.rows;
    this.columnSpacing = options.columnSpacing ?? 0;
    this.rowSpacing = options.rowSpacing ?? 0;
    this.cellWidth = options.cellWidth;
    this.cellHeight = options.cellHeight;
  }

  /**
   * Layout children in grid
   */
  layout(): void {
    if (this.children.length === 0) return;

    // Calculate rows if not specified
    const actualRows =
      this.rows ?? Math.ceil(this.children.length / this.columns);

    // Calculate cell dimensions
    const cellW = this.cellWidth ?? (this.children[0]?.width || 0);
    const cellH = this.cellHeight ?? (this.children[0]?.height || 0);

    // Position each child
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      const row = Math.floor(i / this.columns);
      const col = i % this.columns;

      child.x = col * (cellW + this.columnSpacing);
      child.y = row * (cellH + this.rowSpacing);
    }

    // Update container size based on grid
    this.width =
      this.columns * (cellW + this.columnSpacing) - this.columnSpacing;
    this.height = actualRows * (cellH + this.rowSpacing) - this.rowSpacing;
  }

  /**
   * Override addChild to trigger layout
   */
  addChild(child: Widget): void {
    super.addChild(child);
    this.layout();
  }

  /**
   * Override removeChild to trigger layout
   */
  removeChild(child: Widget): void {
    super.removeChild(child);
    this.layout();
  }

  /**
   * Get child at grid position
   */
  getChildAt(row: number, col: number): Widget | undefined {
    const index = row * this.columns + col;
    return this.children[index];
  }
}
