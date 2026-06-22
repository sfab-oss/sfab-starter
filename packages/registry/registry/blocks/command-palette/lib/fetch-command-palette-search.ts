import type {
  CommandPaletteAction,
  CommandPaletteSearchGroup,
} from "../../../_shared/command-palette";
import { simulateRequest } from "../../../_shared/lib/simulate-request";
import {
  COMMAND_PALETTE_MOCK_ACTIONS,
  COMMAND_PALETTE_MOCK_SEARCH_GROUPS,
} from "../../../_shared/mock-command-palette-search";

export async function fetchCommandPaletteSearch(): Promise<{
  actions: CommandPaletteAction[];
  searchGroups: CommandPaletteSearchGroup[];
}> {
  return await simulateRequest({
    actions: COMMAND_PALETTE_MOCK_ACTIONS,
    searchGroups: COMMAND_PALETTE_MOCK_SEARCH_GROUPS,
  });
}
