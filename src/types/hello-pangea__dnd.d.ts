/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentType } from "react";
declare module "@hello-pangea/dnd" {
  export const DragDropContext: ComponentType<any>;
  export const Droppable: ComponentType<any>;
  export const Draggable: ComponentType<any>;
  export type DropResult = any;
  export type DroppableProvided = any;
  export type DraggableProvided = any;
}
