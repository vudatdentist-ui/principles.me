import { loadExecutionState } from "@/features/people/execution-repository";
import { loadPeopleState } from "@/features/people/repository";
import type { EvolutionState } from "./contracts";
import { projectEvolutionState } from "./projection";

export async function loadEvolutionState(
  workspaceId: string,
  options: { goalId?: string | null; newGoal?: boolean } = {}
): Promise<EvolutionState> {
  const [peopleState, executionState] = await Promise.all([
    loadPeopleState(workspaceId),
    loadExecutionState(workspaceId),
  ]);

  return projectEvolutionState(peopleState, executionState, options);
}
