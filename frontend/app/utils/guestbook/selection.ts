import type { Ref } from "vue";
import type { Point } from "@echolotl/types";
import type { RenderedPath } from ".";
import type { GuestbookEditPayload } from "./socket";
import { useAuth } from "~/composables/useAuth";

interface GuestbookSelectionOptions {
  selectedPathIds: Ref<number[]>;
  selectedPaths: Readonly<Ref<RenderedPath[]>>;
  committedPaths: Ref<RenderedPath[]>;
  activeGroupId: Ref<string | null>;
  selectionColorPreview: Ref<string | null>;
  selectionMovement: Map<number, Point>;
  pendingFinishingMoves: Map<string, number[]>;
  canSelectPath: (path: RenderedPath) => boolean;
  canEditSelection: Readonly<Ref<boolean>>;
  canToggleGrouping: Readonly<Ref<boolean>>;
  isGroupedSelection: Readonly<Ref<boolean>>;
  interactionActive: Readonly<Ref<boolean>>;
  getUserId: () => string | undefined;
  sendEdit: (message: GuestbookEditPayload) => string | undefined;
  sendPreview: () => void;
  schedule: () => void;
}

const { isLoggedIn } = useAuth();

export class GuestbookSelection {
  private selectionColorChange: { kind: string; ids: number[] } | null = null;

  constructor(private readonly options: GuestbookSelectionOptions) {}

  setSelection = (ids: number[], groupId?: string | null) => {
    const {
      committedPaths,
      canSelectPath,
      selectedPathIds,
      activeGroupId,
      selectionMovement,
      selectionColorPreview,
      sendPreview,
    } = this.options;
    const selectableIds = new Set(
      committedPaths.value.filter(canSelectPath).map(({ id }) => id),
    );
    ids = ids.filter((id) => selectableIds.has(id));
    selectedPathIds.value = ids;
    activeGroupId.value =
      (ids.length ? groupId : null) ??
      (ids.length === 1
        ? (committedPaths.value.find((path) => path.id === ids[0])?.groupId ??
          null)
        : null);
    selectionMovement.clear();
    selectionColorPreview.value = null;
    sendPreview();
  };

  clearSelection = () => {
    const {
      selectedPathIds,
      selectionMovement,
      activeGroupId,
      selectionColorPreview,
      sendEdit,
      pendingFinishingMoves,
      sendPreview,
    } = this.options;
    const moved = selectedPathIds.value.filter((id) => {
      const offset = selectionMovement.get(id);
      return offset && (offset.x !== 0 || offset.y !== 0);
    });
    selectedPathIds.value = [];
    activeGroupId.value = null;
    selectionMovement.clear();
    selectionColorPreview.value = null;
    if (moved.length) {
      const operationId = sendEdit({ type: "paths:finish-move", ids: moved });
      if (operationId) pendingFinishingMoves.set(operationId, moved);
    }
    sendPreview();
  };

  moveSelectionLayer = (direction: -1 | 1) => {
    const { canEditSelection, interactionActive, selectedPathIds, sendEdit } =
      this.options;
    if (!isLoggedIn.value || !canEditSelection.value || interactionActive.value)
      return;
    const ids = [...selectedPathIds.value];
    sendEdit({ type: "paths:layer", ids, direction });
  };

  toggleSelectionGrouping = () => {
    const {
      canEditSelection,
      canToggleGrouping,
      interactionActive,
      selectedPathIds,
      isGroupedSelection,
      selectedPaths,
      committedPaths,
      activeGroupId,
      sendEdit,
      schedule,
    } = this.options;
    if (
      !isLoggedIn.value ||
      !canEditSelection.value ||
      !canToggleGrouping.value ||
      interactionActive.value
    )
      return;
    const ids = [...selectedPathIds.value];
    if (isGroupedSelection.value) {
      const groupIds = new Set(
        selectedPaths.value.flatMap(({ groupId }) =>
          groupId ? [groupId] : [],
        ),
      );
      const selectedIds = new Set(ids);
      const operationId = sendEdit({ type: "paths:ungroup", ids });
      if (!operationId) return;
      const singleMemberGroupIds = new Set(
        [...groupIds].filter(
          (groupId) =>
            committedPaths.value.filter(
              (path) => path.groupId === groupId && !selectedIds.has(path.id),
            ).length === 1,
        ),
      );
      committedPaths.value = committedPaths.value.map((path) =>
        path.groupId &&
        ((selectedIds.has(path.id) && groupIds.has(path.groupId)) ||
          singleMemberGroupIds.has(path.groupId))
          ? { ...path, groupId: undefined }
          : path,
      );
      activeGroupId.value = null;
    } else {
      if (ids.length < 2) return;
      const groupId = crypto.randomUUID();
      const existingGroupIds = new Set(
        selectedPaths.value.flatMap(({ groupId: selectedGroupId }) =>
          selectedGroupId ? [selectedGroupId] : [],
        ),
      );
      const affectedIds = new Set(
        committedPaths.value
          .filter(
            (path) =>
              ids.includes(path.id) ||
              (!!path.groupId && existingGroupIds.has(path.groupId)),
          )
          .map(({ id }) => id),
      );
      const operationId = sendEdit({ type: "paths:group", ids, groupId });
      if (!operationId) return;
      committedPaths.value = committedPaths.value.map((path) =>
        affectedIds.has(path.id) ? { ...path, groupId } : path,
      );
      activeGroupId.value = groupId;
    }
    schedule();
  };

  setSelectionColor = (color: string) => {
    const { canEditSelection, interactionActive, selectionColorPreview } =
      this.options;
    if (!isLoggedIn.value || !canEditSelection.value || interactionActive.value)
      return;
    selectionColorPreview.value = color;
  };

  beginSelectionColorChange = (kind: string) => {
    if (this.selectionColorChange?.kind !== kind || kind !== "keyboard") {
      this.selectionColorChange = {
        kind,
        ids: [...this.options.selectedPathIds.value],
      };
    }
  };

  endSelectionColorChange = (kind: string) => {
    const { selectionColorPreview, canEditSelection, sendEdit } = this.options;
    if (this.selectionColorChange?.kind !== kind) return;
    const ids = this.selectionColorChange.ids;
    const color = selectionColorPreview.value;
    if (ids.length && color && canEditSelection.value)
      sendEdit({ type: "paths:color", ids, color });
    this.selectionColorChange = null;
  };

  deleteSelection = () => {
    const { canEditSelection, interactionActive, sendEdit, selectedPathIds } =
      this.options;
    if (!isLoggedIn.value || !canEditSelection.value || interactionActive.value)
      return;
    sendEdit({ type: "paths:delete", ids: [...selectedPathIds.value] });
  };

  setSelectionLocked = (locked: boolean) => {
    const { interactionActive, selectedPaths, getUserId, sendEdit } =
      this.options;
    if (!isLoggedIn.value || interactionActive.value) return;
    const ids = selectedPaths.value
      .filter((path) =>
        locked ? path.ownerId === null : path.ownerId === getUserId(),
      )
      .map(({ id }) => id);
    if (ids.length)
      sendEdit({ type: locked ? "paths:lock" : "paths:unlock", ids });
  };
}
