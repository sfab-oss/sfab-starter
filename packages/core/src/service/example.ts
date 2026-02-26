export type ExampleServiceInput = {
  id: string;
};

export type ExampleServiceOutput = {
  id: string;
  result: string;
};

export async function exampleService(
  input: ExampleServiceInput
): Promise<ExampleServiceOutput> {
  await new Promise((resolve) => setTimeout(resolve, 1));
  return {
    id: input.id,
    result: `Processed: ${input.id}`,
  };
}
