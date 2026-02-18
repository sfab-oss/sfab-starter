"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/shadcn/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/shadcn/popover";
import { History } from "lucide-react";
import { useState } from "react";
import { useGetAllChats } from "@/hooks/query/use-chat";

interface ChatHistoryContentProps {
  setOpen: (open: boolean) => void;
  onNavigate: (chatId: string) => void;
  currentChatId?: string;
}

function ChatHistoryContent({
  setOpen,
  onNavigate,
  currentChatId,
}: ChatHistoryContentProps) {
  const { data: chats = [], isLoading } = useGetAllChats();

  const handleSelectChat = (chatId: string) => {
    onNavigate(chatId);
    setOpen(false);
  };

  return (
    <Command>
      <CommandInput placeholder="Search chats..." />
      <CommandList>
        {isLoading ? (
          <CommandEmpty>Loading chats...</CommandEmpty>
          // biome-ignore lint/style/noNestedTernary: Ok
        ) : chats.length === 0 ? (
          <CommandEmpty>No chats found</CommandEmpty>
        ) : (
          <CommandGroup>
            {chats.map((chat) => (
              <CommandItem
                className={currentChatId === chat.id ? "bg-accent" : ""}
                key={chat.id}
                onSelect={() => handleSelectChat(chat.id)}
                value={chat.title}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-sm">{chat.title}</span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(chat.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}

interface ChatHistoryProps {
  onNavigate: (chatId: string) => void;
  currentChatId?: string;
}

export function ChatHistory({ onNavigate, currentChatId }: ChatHistoryProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost">
          <History />
          <span className="sr-only">Chat History</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        {open && (
          <ChatHistoryContent
            currentChatId={currentChatId}
            onNavigate={onNavigate}
            setOpen={setOpen}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
