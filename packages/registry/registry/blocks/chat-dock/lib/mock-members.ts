export interface MockMember {
  id: string;
  name: string;
}

export const MOCK_MEMBERS: MockMember[] = [
  { id: "m-alice", name: "Alice Chen" },
  { id: "m-bruno", name: "Bruno Silva" },
  { id: "m-cara", name: "Cara Nguyen" },
  { id: "m-diego", name: "Diego Okonkwo" },
  { id: "m-elena", name: "Elena Rossi" },
];

export interface MockCommand {
  id: string;
  name: string;
  description: string;
}

export const MOCK_COMMANDS: MockCommand[] = [
  {
    id: "clear",
    name: "clear",
    description: "Clear the current conversation",
  },
  {
    id: "summarize",
    name: "summarize",
    description: "Summarize the conversation so far",
  },
  {
    id: "help",
    name: "help",
    description: "Show available slash commands",
  },
];
