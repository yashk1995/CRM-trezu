"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function SlideOver({ open, onClose, title, children }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40"
          style={{ background: "rgba(10,11,16,0.32)", animation: "fadeOverlay 0.2s ease" }}
        />
        <Dialog.Content
          className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[520px] flex-col focus:outline-none"
          style={{
            background: "var(--paper)",
            borderLeft: "1px solid var(--mist)",
            boxShadow: "-12px 0 40px rgba(10,11,16,0.10)",
            animation: "slideInRight 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
          }}
        >
          <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
